import React, { useState, useEffect } from "react";
import { cotizacionesAPI } from "../services/cotizacionesAPI";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  FileText,
  Receipt,
  Calendar,
  Eye,
  Download,
  Loader2,
  History,
  ShoppingCart
} from "lucide-react";

const HistorialCotizaciones = () => {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [selectedCotizacion, setSelectedCotizacion] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [converting, setConverting] = useState(null);

  const fetchCotizaciones = async () => {
    try {
      const response = await cotizacionesAPI.getAll({
        estado: estadoFilter !== "all" ? estadoFilter : undefined,
      });
      setCotizaciones(response.data);
    } catch (error) {
      toast.error("Error al cargar cotizaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCotizaciones();
  }, [estadoFilter]);

  const filteredCotizaciones = cotizaciones.filter((cotizacion) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      cotizacion.numero_cotizacion?.toLowerCase().includes(searchLower) ||
      cotizacion.cliente_nombre?.toLowerCase().includes(searchLower) ||
      cotizacion.vendedor_nombre?.toLowerCase().includes(searchLower)
    );
  });

  const handleViewDetails = (cot) => {
    setSelectedCotizacion(cot);
    setDetailsOpen(true);
  };

  const handleDownloadPDF = async (cot) => {
    setDownloading(cot.id);
    try {
      await cotizacionesAPI.downloadPDF(cot.id);
      toast.success("PDF descargado");
    } catch (error) {
      toast.error("Error al descargar PDF");
    } finally {
      setDownloading(null);
    }
  };
  
  const handleConvertirVenta = async (cotId) => {
    if(!window.confirm("¿Estás seguro de convertir esta cotización en boleta de venta? (Afectará stock inmediato)")) return;
    
    setConverting(cotId);
    try {
      await cotizacionesAPI.convertirAVenta(cotId, "boleta");
      toast.success("¡Cotización convertida en Venta exitosamente!");
      fetchCotizaciones();
      setDetailsOpen(false);
    } catch (error) {
      let errorMessage = "Error al convertir";
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      toast.error(errorMessage);
    } finally {
        setConverting(null);
    }
  };

  // Calculate totals
  const totalCotizaciones = filteredCotizaciones.reduce((acc, c) => acc + c.total, 0);
  const borradoresCount = filteredCotizaciones.filter((c) => c.estado === "borrador").length;
  const aprobadasCount = filteredCotizaciones.filter((c) => c.estado === "aprobada").length;

  const getBadgeEstado = (estado) => {
      switch(estado) {
          case 'borrador': return <Badge variant="outline" className="bg-slate-100 text-slate-700">Borrador</Badge>;
          case 'enviada': return <Badge variant="outline" className="bg-blue-100 text-blue-700">Enviada</Badge>;
          case 'aprobada': return <Badge variant="outline" className="bg-emerald-100 text-emerald-700">Convertida (Venta)</Badge>;
          case 'rechazada': return <Badge variant="outline" className="bg-red-100 text-red-700">Rechazada</Badge>;
          case 'vencida': return <Badge variant="outline" className="bg-orange-100 text-orange-700">Vencida</Badge>;
          default: return <Badge variant="outline">{estado}</Badge>;
      }
  }

  return (
    <div
      className="space-y-4 animate-fade-in"
      data-testid="historial-cotizaciones-page"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Historial de Cotizaciones
          </h1>
          <p className="text-sm text-slate-500">
            {filteredCotizaciones.length} cotizaciones registradas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-slate-50 text-slate-700">
            <FileText className="h-3 w-3 mr-1" />
            {borradoresCount} Borradores
          </Badge>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
            <ShoppingCart className="h-3 w-3 mr-1" />
            {aprobadasCount} Convertidas
          </Badge>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="border-slate-200 bg-gradient-to-r from-blue-600 to-blue-500 text-white">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-50 text-sm">Valor Propuesto Total</p>
              <p className="text-3xl font-bold mt-1">
                {formatCurrency(totalCotizaciones)}
              </p>
            </div>
            <FileText className="h-12 w-12 text-white/20" />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por N° cotización, cliente o vendedor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="borrador">Borrador</SelectItem>
                <SelectItem value="enviada">Enviada</SelectItem>
                <SelectItem value="aprobada">Convertidas a Venta</SelectItem>
                <SelectItem value="vencida">Vencidas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cotizaciones List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredCotizaciones.length > 0 ? (
        <>
          {/* Desktop Table */}
          <Card className="border-slate-200 hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cotización</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCotizaciones.map((cot) => (
                  <TableRow key={cot.id}>
                    <TableCell>
                      <Badge className="font-mono bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
                        {cot.numero_cotizacion}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-slate-900">
                        {cot.cliente_nombre || "Cliente General"}
                      </p>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {cot.vendedor_nombre}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <Calendar className="h-3 w-3" />
                        {new Date(cot.fecha_vencimiento).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                        {getBadgeEstado(cot.estado)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-800">
                      {formatCurrency(cot.total)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewDetails(cot)}
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-600"
                          onClick={() => handleDownloadPDF(cot)}
                          disabled={downloading === cot.id}
                          title="Descargar PDF"
                        >
                          {downloading === cot.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredCotizaciones.map((cot) => (
              <Card key={cot.id} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge className="font-mono mb-2 bg-blue-50 text-blue-700">
                        {cot.numero_cotizacion}
                      </Badge>
                      <p className="font-medium text-slate-900">
                        {cot.cliente_nombre || "Cliente General"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                          Vence: {new Date(cot.fecha_vencimiento).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-bold text-slate-800">
                        {formatCurrency(cot.total)}
                        </p>
                        <div className="mt-1">
                            {getBadgeEstado(cot.estado)}
                        </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <p className="text-sm text-slate-500">
                      Vendedor: {cot.vendedor_nombre}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(cot)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPDF(cot)}
                        disabled={downloading === cot.id}
                      >
                        {downloading === cot.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <History className="h-16 w-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">
              No hay cotizaciones
            </h3>
            <p className="text-slate-400">
              {search || estadoFilter
                ? "No se encontraron cotizaciones con los filtros aplicados"
                : "Las cotizaciones aparecerán aquí"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Detalle de Cotización
            </DialogTitle>
          </DialogHeader>

          {selectedCotizacion && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                {/* Header Info */}
                <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="font-mono bg-blue-100 text-blue-700">
                      {selectedCotizacion.numero_cotizacion}
                    </Badge>
                    <span className="text-sm text-slate-500">
                      {formatDateTime(selectedCotizacion.fecha)}
                    </span>
                  </div>
                  <p className="font-medium">
                    {selectedCotizacion.cliente_nombre || "Cliente General"}
                  </p>
                  <p className="text-sm text-slate-500">
                    Válido hasta: {new Date(selectedCotizacion.fecha_vencimiento).toLocaleDateString()}
                  </p>
                  <div className="mt-2 text-sm text-slate-500 pr-4">
                      {getBadgeEstado(selectedCotizacion.estado)}
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h4 className="font-medium text-sm text-slate-500 mb-2">
                    Productos Propios de Cotización
                  </h4>
                  <div className="space-y-2">
                    {selectedCotizacion.items?.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {item.producto_nombre}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.cantidad} x{" "}
                            {formatCurrency(item.precio_unitario)}
                          </p>
                        </div>
                        <p className="font-semibold text-slate-700">
                          {formatCurrency(item.subtotal)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(selectedCotizacion.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>IGV (18%)</span>
                    <span>{formatCurrency(selectedCotizacion.igv)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200">
                    <span>TOTAL</span>
                    <span className="text-slate-800">
                      {formatCurrency(selectedCotizacion.total)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                    {(selectedCotizacion.estado === 'borrador' || selectedCotizacion.estado === 'enviada') && (
                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleConvertirVenta(selectedCotizacion.id)}
                            disabled={converting === selectedCotizacion.id}
                        >
                            {converting === selectedCotizacion.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <ShoppingCart className="h-4 w-4 mr-2" />
                            )}
                            Aprobar y Convertir a Venta
                        </Button>
                    )}
                    
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleDownloadPDF(selectedCotizacion)}
                        disabled={downloading === selectedCotizacion.id}
                    >
                        {downloading === selectedCotizacion.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Download className="h-4 w-4 mr-2 text-rose-600" />
                        )}
                        Descargar Cotización (PDF)
                    </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HistorialCotizaciones;
