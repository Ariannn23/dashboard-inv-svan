import React, { useState, useEffect, useCallback } from "react";
import { productosAPI, ventasAPI, clientesAPI } from "../lib/api";
import { useCart } from "../context/CartContext";
import { formatCurrency, cn } from "../lib/utils";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import ClienteFormModal from "../components/ClienteFormModal";
import ClienteSelector from "../components/ClienteSelector";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Receipt,
  FileText,
  Package,
  Loader2,
  Check,
  X,
  UserPlus,
} from "lucide-react";

const ProductoPOS = ({ producto, onAdd }) => {
  const stockBajo = producto.stock <= producto.stock_minimo;
  const sinStock = producto.stock === 0;

  return (
    <button
      onClick={() => !sinStock && onAdd(producto)}
      disabled={sinStock}
      className={cn(
        "flex flex-col p-3 gap-2 text-left rounded-xl border transition-all duration-150",
        "bg-white hover:border-rose-500 hover:shadow-md active:scale-[0.98]",
        sinStock && "opacity-50 cursor-not-allowed",
        stockBajo && !sinStock && "border-amber-300 bg-amber-50/50",
      )}
      data-testid={`pos-producto-${producto.id}`}
    >
      <div className="flex items-start justify-between">
        <h3 className="font-medium text-sm text-slate-900 line-clamp-2">
          {producto.nombre}
        </h3>
        {stockBajo && !sinStock && (
          <Badge
            variant="outline"
            className="text-[10px] bg-amber-100 text-amber-700 border-amber-200"
          >
            Bajo
          </Badge>
        )}
        {sinStock && (
          <Badge
            variant="outline"
            className="text-[10px] bg-red-100 text-red-700 border-red-200"
          >
            Agotado
          </Badge>
        )}
      </div>
      <div className="flex items-end justify-between mt-auto">
        <span className="text-lg font-bold text-rose-600">
          {formatCurrency(producto.precio_venta)}
        </span>
        <span className="text-xs text-slate-400">Stock: {producto.stock}</span>
      </div>
    </button>
  );
};

const CartItem = ({ item, onUpdate, onRemove }) => (
  <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 p-3 bg-slate-50 rounded-lg">
    <div className="min-w-0 pr-2">
      <p
        className="font-medium text-sm text-slate-900 truncate"
        title={item.producto_nombre}
      >
        {item.producto_nombre}
      </p>
      <p className="text-xs text-slate-500">
        {formatCurrency(item.precio_unitario)} c/u
      </p>
    </div>

    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7 bg-white"
        onClick={() => onUpdate(item.producto_id, item.cantidad - 1)}
        data-testid={`cart-decrease-${item.producto_id}`}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <span className="w-6 text-center text-sm font-medium">
        {item.cantidad}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7 bg-white"
        onClick={() => onUpdate(item.producto_id, item.cantidad + 1)}
        disabled={item.cantidad >= item.stock_disponible}
        data-testid={`cart-increase-${item.producto_id}`}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>

    <div className="flex items-center gap-2 justify-end">
      <p className="font-semibold text-rose-600 whitespace-nowrap">
        {formatCurrency(item.subtotal)}
      </p>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(item.producto_id)}
        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
        data-testid={`cart-remove-${item.producto_id}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

// Moved CartContent outside to prevent re-renders and focus loss
const CartContent = ({
  items,
  cliente,
  setCliente,
  clientes,
  loadingClientes,
  setClienteModalOpen,
  tipoComprobante,
  setTipoComprobante,
  updateQuantity,
  removeItem,
  subtotal,
  igv,
  total,
  clearCart,
  handleFinalizarVenta,
  submitting,
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Client Selection */}
      <div className="p-4 border-b border-slate-200 space-y-3">
        <ClienteSelector
          tipoComprobante={tipoComprobante}
          cliente={cliente}
          setCliente={setCliente}
          clientes={clientes}
          loadingClientes={loadingClientes}
          onNuevoCliente={() => setClienteModalOpen(true)}
        />
      </div>

      {/* Cart Items */}
      <ScrollArea className="flex-1 p-4">
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => (
              <CartItem
                key={item.producto_id}
                item={item}
                onUpdate={updateQuantity}
                onRemove={removeItem}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
            <ShoppingCart className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">Carrito vacío</p>
            <p className="text-xs">Seleccione productos para agregar</p>
          </div>
        )}
      </ScrollArea>

      {/* Totals & Actions */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-4">
        {/* Comprobante Type */}
        <div className="flex gap-2">
          <Button
            variant={tipoComprobante === "boleta" ? "default" : "outline"}
            className={cn(
              "flex-1",
              tipoComprobante === "boleta" && "bg-rose-500 hover:bg-rose-600",
            )}
            onClick={() => setTipoComprobante("boleta")}
            data-testid="tipo-boleta-btn"
          >
            <Receipt className="h-4 w-4 mr-2" />
            Boleta
          </Button>
          <Button
            variant={tipoComprobante === "factura" ? "default" : "outline"}
            className={cn(
              "flex-1",
              tipoComprobante === "factura" && "bg-rose-500 hover:bg-rose-600",
            )}
            onClick={() => setTipoComprobante("factura")}
            data-testid="tipo-factura-btn"
          >
            <FileText className="h-4 w-4 mr-2" />
            Factura
          </Button>
        </div>

        {/* Totals */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>IGV (18%)</span>
            <span>{formatCurrency(igv)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t">
            <span>TOTAL</span>
            <span className="text-rose-700">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={clearCart}
            disabled={items.length === 0}
            data-testid="clear-cart-btn"
          >
            <X className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
          <Button
            className="flex-1 bg-rose-600 hover:bg-rose-700"
            onClick={handleFinalizarVenta}
            disabled={items.length === 0 || submitting}
            data-testid="finalizar-venta-btn"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Cobrar
          </Button>
        </div>
      </div>
    </div>
  );
};

const Ventas = () => {
  const {
    items,
    subtotal,
    igv,
    total,
    itemCount,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    cliente,
    setCliente,
    tipoComprobante,
    setTipoComprobante,
  } = useCart();

  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successDialog, setSuccessDialog] = useState(false);
  const [lastVenta, setLastVenta] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clienteModalOpen, setClienteModalOpen] = useState(false);

  const fetchProductos = useCallback(async () => {
    try {
      const response = await productosAPI.getAll({
        search: search || undefined,
        categoria: categoriaFilter || undefined,
      });
      setProductos(response.data);
    } catch (error) {
      toast.error("Error al cargar productos");
    } finally {
      setLoading(false);
    }
  }, [search, categoriaFilter]);

  useEffect(() => {
    const debounce = setTimeout(fetchProductos, 200);
    return () => clearTimeout(debounce);
  }, [fetchProductos]);

  const fetchClientes = useCallback(async () => {
    setLoadingClientes(true);
    try {
      const response = await clientesAPI.getAll();
      setClientes(response.data);
    } catch (error) {
      toast.error("Error al cargar clientes");
    } finally {
      setLoadingClientes(false);
    }
  }, []);

  // Load clients on mount
  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const handleClienteCreated = (nuevoCliente) => {
    setClientes((prev) => [...prev, nuevoCliente]);
    setCliente({
      id: nuevoCliente.id,
      nombre_razon_social: nuevoCliente.nombre_razon_social,
      documento: nuevoCliente.documento,
    });
    toast.success("Cliente seleccionado");
  };

  const handleAddItem = (producto) => {
    addItem(producto);
    toast.success(`${producto.nombre} agregado`, { duration: 1500 });
  };

  const handleFinalizarVenta = async () => {
    if (items.length === 0) {
      toast.error("Agregue productos al carrito");
      return;
    }

    setSubmitting(true);
    try {
      const ventaData = {
        cliente_id: cliente?.id || null,
        cliente_nombre: cliente?.nombre_razon_social || "Cliente General",
        cliente_documento: cliente?.documento || "00000000",
        items: items.map((item) => ({
          producto_id: item.producto_id,
          producto_nombre: item.producto_nombre,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
        })),
        tipo_comprobante: tipoComprobante,
      };

      const response = await ventasAPI.create(ventaData);
      setLastVenta({
        ...response.data,
        total,
        tipo_comprobante: tipoComprobante,
      });
      setSuccessDialog(true);
      clearCart();
      fetchProductos();
    } catch (error) {
      console.error("Error processing sale:", error);
      let errorMessage = "Error al procesar venta";

      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === "string") {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          errorMessage = detail
            .map((err) => err.msg || JSON.stringify(err))
            .join(", ");
        } else {
          errorMessage = JSON.stringify(detail);
        }
      }

      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!lastVenta?.id) return;

    try {
      const response = await ventasAPI.getPDF(lastVenta.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `comprobante_${lastVenta.numero_comprobante}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Error al descargar PDF");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in" data-testid="ventas-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nueva Venta</h1>
          <p className="text-sm text-slate-500">Sistema POS</p>
        </div>

        {/* Mobile Cart Button */}
        <Sheet open={cartOpen} onOpenChange={setCartOpen}>
          <SheetTrigger asChild>
            <Button
              className="lg:hidden relative bg-rose-600 hover:bg-rose-700"
              data-testid="mobile-cart-btn"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:w-96 p-0">
            <SheetHeader className="p-4 border-b border-slate-200">
              <SheetTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-rose-600" />
                Carrito ({itemCount})
              </SheetTitle>
            </SheetHeader>
            <CartContent
              items={items}
              cliente={cliente}
              setCliente={setCliente}
              clientes={clientes}
              loadingClientes={loadingClientes}
              setClienteModalOpen={setClienteModalOpen}
              tipoComprobante={tipoComprobante}
              setTipoComprobante={setTipoComprobante}
              updateQuantity={updateQuantity}
              removeItem={removeItem}
              subtotal={subtotal}
              igv={igv}
              total={total}
              clearCart={clearCart}
              handleFinalizarVenta={handleFinalizarVenta}
              submitting={submitting}
            />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex gap-6">
        {/* Products Section */}
        <div className="flex-1 space-y-4">
          {/* Search & Filters */}
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar productos..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                    data-testid="pos-search-input"
                  />
                </div>
                <Select
                  value={categoriaFilter}
                  onValueChange={setCategoriaFilter}
                >
                  <SelectTrigger
                    className="w-full sm:w-48"
                    data-testid="pos-categoria-filter"
                  >
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="Alimento para Animales">
                      Alimentos
                    </SelectItem>
                    <SelectItem value="Abarrotes">Abarrotes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Products Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
            </div>
          ) : productos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {productos.map((producto) => (
                <ProductoPOS
                  key={producto.id}
                  producto={producto}
                  onAdd={handleAddItem}
                />
              ))}
            </div>
          ) : (
            <Card className="border-slate-200">
              <CardContent className="py-16 text-center">
                <Package className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-600">
                  No hay productos
                </h3>
                <p className="text-slate-400">
                  {search
                    ? "Intente con otro término de búsqueda"
                    : "No hay productos disponibles"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Desktop Cart Sidebar */}
        <Card className="hidden lg:flex w-96 border-slate-200 flex-col sticky top-20 h-[calc(100vh-8rem)]">
          <CardHeader className="border-b border-slate-200 py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-5 w-5 text-rose-600" />
              Carrito ({itemCount})
            </CardTitle>
          </CardHeader>
          <CartContent
            items={items}
            cliente={cliente}
            setCliente={setCliente}
            clientes={clientes}
            loadingClientes={loadingClientes}
            setClienteModalOpen={setClienteModalOpen}
            tipoComprobante={tipoComprobante}
            setTipoComprobante={setTipoComprobante}
            updateQuantity={updateQuantity}
            removeItem={removeItem}
            subtotal={subtotal}
            igv={igv}
            total={total}
            clearCart={clearCart}
            handleFinalizarVenta={handleFinalizarVenta}
            submitting={submitting}
          />
        </Card>
      </div>

      {/* Success Dialog */}
      <Dialog open={successDialog} onOpenChange={setSuccessDialog}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-emerald-600" />
            </div>
            <DialogTitle className="text-xl">¡Venta Exitosa!</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <p className="text-2xl font-bold text-emerald-700">
              {formatCurrency(lastVenta?.total || 0)}
            </p>
            <p className="text-slate-500">{lastVenta?.numero_comprobante}</p>
            <Badge
              className={
                lastVenta?.tipo_comprobante === "boleta"
                  ? "bg-slate-100 text-slate-600"
                  : "bg-blue-100 text-blue-600"
              }
            >
              {lastVenta?.tipo_comprobante === "boleta" ? "Boleta" : "Factura"}
            </Badge>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button
              onClick={handleDownloadPDF}
              className="w-full bg-rose-600 hover:bg-rose-700"
              data-testid="download-pdf-btn"
            >
              <FileText className="h-4 w-4 mr-2" />
              Descargar Comprobante
            </Button>
            <Button
              variant="outline"
              onClick={() => setSuccessDialog(false)}
              className="w-full"
              data-testid="nueva-venta-btn"
            >
              Nueva Venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cliente Registration Modal */}
      <ClienteFormModal
        open={clienteModalOpen}
        onOpenChange={setClienteModalOpen}
        onClienteCreated={handleClienteCreated}
        tipoComprobante={tipoComprobante}
      />
    </div>
  );
};

export default Ventas;
