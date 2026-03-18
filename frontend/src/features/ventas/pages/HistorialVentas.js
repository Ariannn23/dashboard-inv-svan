import React, { useState, useEffect } from "react";
import { ventasAPI } from "../services/ventasAPI";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
} from "lucide-react";

const HistorialVentas = () => {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    const fetchVentas = async () => {
      try {
        const response = await ventasAPI.getAll({
          tipo_comprobante: tipoFilter || undefined,
        });
        setVentas(response.data.data);
      } catch (error) {
        toast.error("Error al cargar ventas");
      } finally {
        setLoading(false);
      }
    };

    fetchVentas();
  }, [tipoFilter]);

  const filteredVentas = ventas.filter((venta) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      venta.numero_comprobante?.toLowerCase().includes(searchLower) ||
      venta.cliente_nombre?.toLowerCase().includes(searchLower) ||
      venta.vendedor_nombre?.toLowerCase().includes(searchLower)
    );
  });

  const handleViewDetails = (venta) => {
    setSelectedVenta(venta);
    setDetailsOpen(true);
  };

  const handleDownloadPDF = async (venta) => {
    setDownloading(venta.id);
    try {
      const response = await ventasAPI.getPDF(venta.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `comprobante_${venta.numero_comprobante}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Comprobante descargado");
    } catch (error) {
      toast.error("Error al descargar PDF");
    } finally {
      setDownloading(null);
    }
  };

  // Calculate totals
  const totalVentas = filteredVentas.reduce((acc, v) => acc + v.total, 0);
  const boletasCount = filteredVentas.filter(
    (v) => v.tipo_comprobante === "boleta",
  ).length;
  const facturasCount = filteredVentas.filter(
    (v) => v.tipo_comprobante === "factura",
  ).length;

  return (
    <div
      className="space-y-4 animate-fade-in"
      data-testid="historial-ventas-page"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Historial de Ventas
          </h1>
          <p className="text-sm text-slate-500">
            {filteredVentas.length} ventas registradas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-orange-50 text-orange-700">
            <Receipt className="h-3 w-3 mr-1" />
            {boletasCount} Boletas
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            <FileText className="h-3 w-3 mr-1" />
            {facturasCount} Facturas
          </Badge>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="border-slate-200 bg-gradient-to-r from-rose-600 to-rose-500 text-white">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-rose-50 text-sm">Total en Ventas</p>
              <p className="text-3xl font-bold mt-1">
                {formatCurrency(totalVentas)}
              </p>
            </div>
            <History className="h-12 w-12 text-white/20" />
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
                placeholder="Buscar por N° comprobante, cliente o vendedor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="search-ventas-input"
              />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger
                className="w-full sm:w-48"
                data-testid="tipo-comprobante-filter"
              >
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="boleta">Boletas</SelectItem>
                <SelectItem value="factura">Facturas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sales List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
        </div>
      ) : filteredVentas.length > 0 ? (
        <>
          {/* Desktop Table */}
          <Card className="border-slate-200 hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comprobante</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVentas.map((venta) => (
                  <TableRow key={venta.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={cn(
                            "font-mono",
                            venta.tipo_comprobante === "boleta"
                              ? "bg-orange-100 text-orange-700 hover:bg-orange-100"
                              : "bg-blue-100 text-blue-700 hover:bg-blue-100",
                          )}
                        >
                          {venta.numero_comprobante}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-slate-900">
                        {venta.cliente_nombre || "Cliente General"}
                      </p>
                      {venta.cliente_documento && (
                        <p className="text-xs text-slate-400">
                          {venta.cliente_documento}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {venta.vendedor_nombre}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(venta.fecha)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-700">
                      {formatCurrency(venta.total)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewDetails(venta)}
                          data-testid={`view-venta-${venta.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownloadPDF(venta)}
                          disabled={downloading === venta.id}
                          data-testid={`download-venta-${venta.id}`}
                        >
                          {downloading === venta.id ? (
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
            {filteredVentas.map((venta) => (
              <Card key={venta.id} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge
                        className={cn(
                          "font-mono mb-2",
                          venta.tipo_comprobante === "boleta"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-100 text-blue-700",
                        )}
                      >
                        {venta.numero_comprobante}
                      </Badge>
                      <p className="font-medium text-slate-900">
                        {venta.cliente_nombre || "Cliente General"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {formatDateTime(venta.fecha)}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-emerald-700">
                      {formatCurrency(venta.total)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <p className="text-sm text-slate-500">
                      Vendedor: {venta.vendedor_nombre}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(venta)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPDF(venta)}
                        disabled={downloading === venta.id}
                      >
                        {downloading === venta.id ? (
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
              No hay ventas
            </h3>
            <p className="text-slate-400">
              {search || tipoFilter
                ? "No se encontraron ventas con los filtros aplicados"
                : "Las ventas aparecerán aquí"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-rose-600" />
              Detalle de Venta
            </DialogTitle>
          </DialogHeader>

          {selectedVenta && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                {/* Header Info */}
                <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      className={cn(
                        "font-mono",
                        selectedVenta.tipo_comprobante === "boleta"
                          ? "bg-slate-200 text-slate-700"
                          : "bg-blue-100 text-blue-700",
                      )}
                    >
                      {selectedVenta.numero_comprobante}
                    </Badge>
                    <span className="text-sm text-slate-500">
                      {formatDateTime(selectedVenta.fecha)}
                    </span>
                  </div>
                  <p className="font-medium">
                    {selectedVenta.cliente_nombre || "Cliente General"}
                  </p>
                  {selectedVenta.cliente_documento && (
                    <p className="text-sm text-slate-500">
                      Doc: {selectedVenta.cliente_documento}
                    </p>
                  )}
                  <p className="text-sm text-slate-500">
                    Vendedor: {selectedVenta.vendedor_nombre}
                  </p>
                </div>

                {/* Items */}
                <div>
                  <h4 className="font-medium text-sm text-slate-500 mb-2">
                    Productos
                  </h4>
                  <div className="space-y-2">
                    {selectedVenta.items?.map((item, index) => (
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
                        <p className="font-semibold text-emerald-700">
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
                    <span>{formatCurrency(selectedVenta.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>IGV (18%)</span>
                    <span>{formatCurrency(selectedVenta.igv)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200">
                    <span>TOTAL</span>
                    <span className="text-emerald-700">
                      {formatCurrency(selectedVenta.total)}
                    </span>
                  </div>
                </div>

                {/* Download Button */}
                <Button
                  className="w-full bg-rose-600 hover:bg-rose-700"
                  onClick={() => handleDownloadPDF(selectedVenta)}
                  disabled={downloading === selectedVenta.id}
                >
                  {downloading === selectedVenta.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Descargar Comprobante
                </Button>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HistorialVentas;
