import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { productosAPI } from "@/features/productos/services/productosAPI";
import { inventarioAPI } from "../services/inventarioAPI";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  Plus,
  Minus,
  Package,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertTriangle,
  Loader2,
  ClipboardList,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

const Inventario = () => {
  const { isAdmin } = useAuth();
  const [productos, setProductos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [productoFilter, setProductoFilter] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");
  const [activeTab, setActiveTab] = useState("stock");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [movimientoTipo, setMovimientoTipo] = useState("entrada");
  const [formData, setFormData] = useState({
    producto_id: "",
    cantidad: "",
    observaciones: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [productosRes, movimientosRes] = await Promise.all([
        productosAPI.getAll(),
        inventarioAPI.getMovimientos({
          producto_id:
            productoFilter && productoFilter !== "all"
              ? productoFilter
              : undefined,
          tipo: tipoFilter && tipoFilter !== "all" ? tipoFilter : undefined,
        }),
      ]);
      setProductos(productosRes.data);
      setMovimientos(movimientosRes.data);
    } catch (error) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [productoFilter, tipoFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenDialog = (tipo) => {
    setMovimientoTipo(tipo);
    setFormData({ producto_id: "", cantidad: "", observaciones: "" });
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.producto_id || !formData.cantidad) {
      toast.error("Seleccione un producto y cantidad");
      return;
    }

    const cantidad = parseInt(formData.cantidad);
    if (cantidad <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        producto_id: formData.producto_id,
        tipo: movimientoTipo,
        cantidad,
        observaciones: formData.observaciones || null,
      };

      if (movimientoTipo === "entrada") {
        await inventarioAPI.registrarEntrada(data);
        toast.success("Entrada registrada");
      } else {
        await inventarioAPI.registrarSalida(data);
        toast.success("Salida registrada");
      }

      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Error al registrar movimiento",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Filter products
  const filteredProductos = productos.filter((p) => {
    if (!search) return true;
    return p.nombre.toLowerCase().includes(search.toLowerCase());
  });

  const stockBajoCount = productos.filter(
    (p) => p.stock <= p.stock_minimo,
  ).length;
  const valorTotal = productos.reduce(
    (acc, p) => acc + p.stock * p.precio_compra,
    0,
  );

  return (
    <div className="space-y-4 animate-fade-in" data-testid="inventario-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventario</h1>
          <p className="text-sm text-slate-500">
            Control de stock y movimientos
          </p>
        </div>
        {isAdmin() && (
          <div className="flex gap-2">
            <Button
              onClick={() => handleOpenDialog("entrada")}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="add-entrada-btn"
            >
              <ArrowDownCircle className="h-4 w-4 mr-2" />
              Entrada
            </Button>
            <Button
              onClick={() => handleOpenDialog("salida")}
              variant="outline"
              className="border-amber-500 text-amber-600 hover:bg-amber-50"
              data-testid="add-salida-btn"
            >
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Salida
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Productos</p>
                <p className="text-xl font-bold text-slate-900">
                  {productos.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Stock Bajo</p>
                <p className="text-xl font-bold text-amber-600">
                  {stockBajoCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Valor Inventario</p>
                <p className="text-xl font-bold text-emerald-600">
                  {formatCurrency(valorTotal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Movimientos</p>
                <p className="text-xl font-bold text-blue-600">
                  {movimientos.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stock" data-testid="tab-stock">
            <Package className="h-4 w-4 mr-2" />
            Stock Actual
          </TabsTrigger>
          <TabsTrigger value="kardex" data-testid="tab-kardex">
            <ClipboardList className="h-4 w-4 mr-2" />
            Kardex
          </TabsTrigger>
        </TabsList>

        {/* Stock Tab */}
        <TabsContent value="stock" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar productos..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                    data-testid="search-stock-input"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
                </div>
              ) : filteredProductos.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-center">Stock</TableHead>
                        <TableHead className="text-center">Mínimo</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProductos.map((producto) => {
                        const stockBajo =
                          producto.stock <= producto.stock_minimo;
                        const agotado = producto.stock === 0;

                        return (
                          <TableRow key={producto.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {producto.nombre}
                                </p>
                                <Badge
                                  variant="outline"
                                  className="text-xs mt-1"
                                >
                                  {producto.categoria}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span
                                className={cn(
                                  "font-semibold",
                                  agotado && "text-red-600",
                                  stockBajo && !agotado && "text-amber-600",
                                  !stockBajo && "text-emerald-600",
                                )}
                              >
                                {producto.stock}
                              </span>
                              <span className="text-sm text-slate-400 ml-1">
                                {producto.unidad}
                              </span>
                            </TableCell>
                            <TableCell className="text-center text-slate-500">
                              {producto.stock_minimo}
                            </TableCell>
                            <TableCell className="text-right font-medium text-emerald-600">
                              {formatCurrency(
                                producto.stock * producto.precio_compra,
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {agotado ? (
                                <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                                  Agotado
                                </Badge>
                              ) : stockBajo ? (
                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Bajo
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                  OK
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay productos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kardex Tab */}
        <TabsContent value="kardex" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <Select
                  value={productoFilter}
                  onValueChange={setProductoFilter}
                >
                  <SelectTrigger
                    className="w-full sm:w-64"
                    data-testid="kardex-producto-filter"
                  >
                    <SelectValue placeholder="Filtrar por producto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los productos</SelectItem>
                    {productos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger
                    className="w-full sm:w-40"
                    data-testid="kardex-tipo-filter"
                  >
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="entrada">Entradas</SelectItem>
                    <SelectItem value="salida">Salidas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
                </div>
              ) : movimientos.length > 0 ? (
                <div className="space-y-3">
                  {movimientos.map((mov) => (
                    <div
                      key={mov.id}
                      className={cn(
                        "p-4 rounded-lg border",
                        mov.tipo === "entrada"
                          ? "bg-emerald-50 border-emerald-200"
                          : "bg-amber-50 border-amber-200",
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "p-2 rounded-full",
                              mov.tipo === "entrada"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700",
                            )}
                          >
                            {mov.tipo === "entrada" ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {mov.producto_nombre}
                            </p>
                            <p className="text-sm text-slate-500">
                              {mov.usuario_nombre}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={cn(
                              "text-lg font-bold",
                              mov.tipo === "entrada"
                                ? "text-emerald-700"
                                : "text-amber-700",
                            )}
                          >
                            {mov.tipo === "entrada" ? "+" : "-"}
                            {mov.cantidad}
                          </span>
                          <p className="text-xs text-slate-500">
                            {mov.stock_anterior} → {mov.stock_nuevo}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>{formatDateTime(mov.fecha)}</span>
                        {mov.observaciones && (
                          <span className="italic">{mov.observaciones}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay movimientos registrados</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Movement Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {movimientoTipo === "entrada" ? (
                <>
                  <ArrowDownCircle className="h-5 w-5 text-emerald-600" />
                  Registrar Entrada
                </>
              ) : (
                <>
                  <ArrowUpCircle className="h-5 w-5 text-amber-600" />
                  Registrar Salida
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Producto *</Label>
              <Select
                value={formData.producto_id}
                onValueChange={(v) =>
                  setFormData({ ...formData, producto_id: v })
                }
              >
                <SelectTrigger data-testid="movimiento-producto-select">
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {productos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{p.nombre}</span>
                        <Badge variant="outline" className="ml-2">
                          Stock: {p.stock}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad *</Label>
              <Input
                id="cantidad"
                type="number"
                min="1"
                value={formData.cantidad}
                onChange={(e) =>
                  setFormData({ ...formData, cantidad: e.target.value })
                }
                placeholder="Ingrese cantidad"
                data-testid="movimiento-cantidad-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) =>
                  setFormData({ ...formData, observaciones: e.target.value })
                }
                placeholder="Ej: Compra a proveedor, Ajuste de inventario..."
                rows={2}
                data-testid="movimiento-observaciones-input"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className={
                  movimientoTipo === "entrada"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }
                data-testid="save-movimiento-btn"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {movimientoTipo === "entrada" ? (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Entrada
                  </>
                ) : (
                  <>
                    <Minus className="h-4 w-4 mr-2" />
                    Registrar Salida
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventario;
