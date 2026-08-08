import React, { useState, useEffect, useCallback } from "react";
import { notasCreditoAPI } from "../services/notasCreditoAPI";
import { ventasAPI } from "@/features/ventas/services/ventasAPI";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Download,
  Plus,
  FileText,
  RotateCcw,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

const NotasCredito = () => {
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState(null);
  const [selectedNota, setSelectedNota] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // States for New Note flow
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [saleSearch, setSaleSearch] = useState("");
  const [matchingSales, setMatchingSales] = useState([]);
  const [searchingSales, setSearchingSales] = useState(false);

  const [selectedSale, setSelectedSale] = useState(null);
  const [isEmitOpen, setIsEmitOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNotas = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notasCreditoAPI.getAll({ search });
      setNotas(response.data.data);
    } catch (error) {
      toast.error("Error al cargar notas de crédito");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchNotas();
  }, [fetchNotas]);

  const handleSearchSales = useCallback(async (query = saleSearch) => {
    if (!query.trim()) return;
    setSearchingSales(true);
    try {
      const resp = await ventasAPI.getAll({ search: query, limit: 10 });
      setMatchingSales(resp.data.data.filter((v) => v.estado !== "anulada"));
    } catch (error) {
      toast.error("Error al buscar ventas");
    } finally {
      setSearchingSales(false);
    }
  }, [saleSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (saleSearch.trim()) {
        handleSearchSales(saleSearch);
      } else {
        setMatchingSales([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [saleSearch, handleSearchSales]);

  const handleSelectSale = (sale) => {
    setSelectedSale(sale);
    setIsSearchOpen(false);
    setIsEmitOpen(true);
    setMotivo("Devolución por error en pedido"); // Default reason
  };

  const handleCreateNC = async () => {
    if (!motivo.trim()) {
      toast.warning("Por favor ingrese el motivo de la nota de crédito");
      return;
    }

    setIsSubmitting(true);
    try {
      const ncData = {
        venta_id: selectedSale.id,
        motivo: motivo,
        notas: additionalNotes,
        items: selectedSale.items.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
        })),
      };

      await notasCreditoAPI.create(ncData);
      toast.success("Nota de Crédito emitida y Venta anulada");
      setIsEmitOpen(false);
      setSelectedSale(null);
      setMotivo("");
      setAdditionalNotes("");
      fetchNotas();
    } catch (error) {
      const msg =
        error.response?.data?.detail || "Error al emitir nota de crédito";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = async (nc) => {
    setDownloading(nc.id);
    try {
      await notasCreditoAPI.downloadPDF(nc.id);
      toast.success("PDF generado exitosamente");
    } catch (error) {
      toast.error("Error al descargar PDF");
    } finally {
      setDownloading(null);
    }
  };

  const handleViewDetails = (nc) => {
    setSelectedNota(nc);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Notas de Crédito
          </h1>
          <p className="text-slate-500">
            Gestión de devoluciones y anulaciones de ventas
          </p>
        </div>
        <Button
          className="bg-rose-600 hover:bg-rose-700 shadow-md"
          onClick={() => setIsSearchOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Nota de Crédito
        </Button>
      </div>

      <Card className="border-rose-100 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por número o motivo..."
                className="pl-10 border-slate-200 focus:border-rose-300 focus:ring-rose-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="text-sm text-slate-500 font-medium">
              {notas.length} notas registradas
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
            </div>
          ) : (
            <div className="rounded-xl border border-slate-100 overflow-hidden shadow-sm bg-white">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-700">
                      Número NC
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      Venta Ref.
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      Cliente
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      Motivo
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      Fecha
                    </TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">
                      Total
                    </TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-16">
                        <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                          <RotateCcw className="h-10 w-10 opacity-20" />
                          <p>No se encontraron notas de crédito registradas.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    notas.map((nc) => (
                      <TableRow
                        key={nc.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <TableCell className="font-bold text-slate-900">
                          {nc.numero_nota}
                        </TableCell>
                        <TableCell className="font-medium text-slate-600 underline decoration-slate-200 underline-offset-4 cursor-help">
                          {nc.venta_numero}
                        </TableCell>
                        <TableCell>
                          {nc.cliente_nombre || "Público General"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-rose-50 text-rose-700 border-rose-100 font-semibold px-2.5 py-0.5"
                          >
                            {nc.motivo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {formatDateTime(nc.fecha)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-rose-600 text-lg">
                          {formatCurrency(nc.total)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-blue-50 hover:text-blue-600 rounded-full"
                              onClick={() => handleViewDetails(nc)}
                              title="Ver detalle"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-rose-50 hover:text-rose-600 rounded-full"
                              disabled={downloading === nc.id}
                              onClick={() => handleDownloadPDF(nc)}
                              title="Descargar PDF"
                            >
                              {downloading === nc.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIALOG 1: BUSCAR VENTA */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Search className="h-5 w-5 text-rose-600" />
              Nueva Nota de Crédito: Buscar Venta
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ingrese número de boleta/factura o cliente..."
                value={saleSearch}
                onChange={(e) => setSaleSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchSales()}
                className="flex-1"
              />
              <Button onClick={handleSearchSales} disabled={searchingSales}>
                {searchingSales ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Buscar"
                )}
              </Button>
            </div>

            <div className="max-h-[300px] overflow-y-auto rounded-md border border-slate-100">
              {matchingSales.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  {searchingSales
                    ? "Buscando..."
                    : saleSearch
                      ? "No se encontraron ventas para emitir NC."
                      : "Busque una venta para continuar."}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {matchingSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="p-3 hover:bg-slate-50 flex justify-between items-center transition-colors"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          {sale.numero_comprobante}
                        </div>
                        <div className="text-xs text-slate-500">
                          {sale.cliente_nombre || "Público General"} •{" "}
                          {formatDateTime(sale.fecha)}
                        </div>
                        <div className="text-sm font-semibold text-rose-600 mt-1">
                          {formatCurrency(sale.total)}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSelectSale(sale)}
                      >
                        Seleccionar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: EMITIR NOTA DE CRÉDITO */}
      <Dialog open={isEmitOpen} onOpenChange={setIsEmitOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <RotateCcw className="h-5 w-5 text-rose-600" />
              Emitir Nota de Crédito
            </DialogTitle>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                    Venta de Referencia
                  </label>
                  <p className="font-bold text-slate-900">
                    {selectedSale.numero_comprobante}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                    Monto Total
                  </label>
                  <p className="font-bold text-rose-600">
                    {formatCurrency(selectedSale.total)}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                    Cliente
                  </label>
                  <p className="font-medium text-slate-700">
                    {selectedSale.cliente_nombre || "Público General"}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Motivo de Anulación
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                  >
                    <option value="Devolución total">
                      Devolución total de mercadería
                    </option>
                    <option value="Anulación por error en datos">
                      Anulación por error en datos (RUC/Nombre)
                    </option>
                    <option value="Error en precio/descuento">
                      Error en precio o descuento
                    </option>
                    <option value="Pedido cancelado">
                      Pedido cancelado por el cliente
                    </option>
                    <option value="Otro">Otro (especificar en notas)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Notas adicionales (Interno)
                  </label>
                  <Input
                    placeholder="Ej: El cliente no aceptó el producto por daño..."
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                  />
                </div>

                <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <b>IMPORTANTE:</b> Al confirmar esta acción, la venta se
                    marcará como <b>ANULADA</b> y el stock de los productos
                    regresará al inventario automáticamente. Esta acción no se
                    puede deshacer.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setIsEmitOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-rose-600 hover:bg-rose-700"
                  onClick={handleCreateNC}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                      Procesando...
                    </>
                  ) : (
                    "Confirmar y Emitir Nota de Crédito"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: DETALLE DE NOTA DE CRÉDITO */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <FileText className="h-5 w-5 text-rose-600" />
              Detalle de Nota de Crédito
            </DialogTitle>
          </DialogHeader>

          {selectedNota && (
            <div className="space-y-6 pt-2">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Número</span>
                  <span className="font-bold text-slate-900">{selectedNota.numero_nota}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Venta Ref.</span>
                  <span className="font-medium text-slate-700">{selectedNota.venta_numero}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Fecha</span>
                  <span className="text-sm text-slate-600">{formatDateTime(selectedNota.fecha)}</span>
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Cliente</label>
                  <p className="font-medium text-slate-900">{selectedNota.cliente_nombre || "Público General"}</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700">Motivo</label>
                <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-100 font-semibold px-3 py-1 text-sm block w-fit">
                  {selectedNota.motivo}
                </Badge>
              </div>

              {selectedNota.notas && (
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Notas Adicionales</label>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                    "{selectedNota.notas}"
                  </p>
                </div>
              )}

              <div className="border-t border-slate-100 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-slate-900">Total Devuelto</span>
                  <span className="text-2xl font-bold text-rose-600">{formatCurrency(selectedNota.total)}</span>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDetailOpen(false)} className="w-full sm:w-auto">
                  Cerrar
                </Button>
                <Button 
                  className="bg-rose-600 hover:bg-rose-700 w-full sm:w-auto"
                  onClick={() => handleDownloadPDF(selectedNota)}
                  disabled={downloading === selectedNota.id}
                >
                  {downloading === selectedNota.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Descargar PDF
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotasCredito;
