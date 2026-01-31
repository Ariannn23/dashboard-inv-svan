import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { comprasAPI, proveedoresAPI, productosAPI } from '../lib/api';
import { formatCurrency, formatDateTime, cn } from '../lib/utils';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  Search,
  Plus,
  Minus,
  Truck,
  Package,
  Check,
  X,
  Clock,
  ShoppingBag,
  Loader2,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
} from 'lucide-react';

const estadoConfig = {
  pendiente: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  recibida: { label: 'Recibida', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const Compras = () => {
  const { isAdmin } = useAuth();
  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('lista');
  const [estadoFilter, setEstadoFilter] = useState('all');
  
  // New Order State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState('');
  const [itemsCarrito, setItemsCarrito] = useState([]);
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Detail/Actions
  const [selectedCompra, setSelectedCompra] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [comprasRes, proveedoresRes, productosRes, statsRes] = await Promise.all([
        comprasAPI.getAll({ estado: estadoFilter === 'all' ? undefined : estadoFilter }),
        proveedoresAPI.getAll(),
        productosAPI.getAll(),
        comprasAPI.getStats(),
      ]);
      setCompras(comprasRes.data);
      setProveedores(proveedoresRes.data);
      setProductos(productosRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [estadoFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Carrito helpers
  const addToCarrito = (producto) => {
    setItemsCarrito((prev) => {
      const existing = prev.find((item) => item.producto_id === producto.id);
      if (existing) {
        return prev.map((item) =>
          item.producto_id === producto.id
            ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.precio_unitario }
            : item
        );
      }
      return [
        ...prev,
        {
          producto_id: producto.id,
          producto_nombre: producto.nombre,
          cantidad: 1,
          precio_unitario: producto.precio_compra,
          subtotal: producto.precio_compra,
        },
      ];
    });
  };

  const updateCarritoItem = (productoId, cantidad, precioUnitario) => {
    if (cantidad <= 0) {
      setItemsCarrito((prev) => prev.filter((item) => item.producto_id !== productoId));
      return;
    }
    setItemsCarrito((prev) =>
      prev.map((item) =>
        item.producto_id === productoId
          ? { ...item, cantidad, precio_unitario: precioUnitario, subtotal: cantidad * precioUnitario }
          : item
      )
    );
  };

  const removeFromCarrito = (productoId) => {
    setItemsCarrito((prev) => prev.filter((item) => item.producto_id !== productoId));
  };

  const clearCarrito = () => {
    setItemsCarrito([]);
    setSelectedProveedor('');
    setFechaEntrega('');
    setObservaciones('');
  };

  const subtotal = itemsCarrito.reduce((acc, item) => acc + item.subtotal, 0);
  const igv = subtotal * 0.18;
  const total = subtotal + igv;

  const handleCreateCompra = async () => {
    if (!selectedProveedor) {
      toast.error('Seleccione un proveedor');
      return;
    }
    if (itemsCarrito.length === 0) {
      toast.error('Agregue productos a la orden');
      return;
    }

    setSubmitting(true);
    try {
      await comprasAPI.create({
        proveedor_id: selectedProveedor,
        items: itemsCarrito,
        fecha_entrega_estimada: fechaEntrega || null,
        observaciones: observaciones || null,
      });
      toast.success('Orden de compra creada');
      setDialogOpen(false);
      clearCarrito();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear orden');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecibir = async () => {
    if (!selectedCompra) return;
    
    try {
      const result = await comprasAPI.recibir(selectedCompra.id);
      toast.success(`${result.data.message} (${result.data.productos_actualizados} productos)`);
      setConfirmAction(null);
      setDetailOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al recibir compra');
    }
  };

  const handleCancelar = async () => {
    if (!selectedCompra) return;
    
    try {
      await comprasAPI.cancelar(selectedCompra.id);
      toast.success('Orden de compra cancelada');
      setConfirmAction(null);
      setDetailOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cancelar');
    }
  };

  const handleEliminar = async () => {
    if (!selectedCompra) return;
    
    try {
      await comprasAPI.delete(selectedCompra.id);
      toast.success('Orden de compra eliminada');
      setConfirmAction(null);
      setDetailOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar');
    }
  };

  if (!isAdmin()) {
    return (
      <div className="space-y-4 animate-fade-in" data-testid="compras-page">
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <Truck className="h-16 w-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">Acceso Restringido</h3>
            <p className="text-slate-400">Solo los administradores pueden gestionar compras</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in" data-testid="compras-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compras a Proveedores</h1>
          <p className="text-sm text-slate-500">Gestión de órdenes de compra</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-teal-700 hover:bg-teal-800" data-testid="nueva-compra-btn">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Orden de Compra
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-100 text-teal-700">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Compras del Mes</p>
                <p className="text-xl font-bold text-teal-700">{formatCurrency(stats?.compras_mes || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pendientes</p>
                <p className="text-xl font-bold text-amber-600">{stats?.compras_pendientes || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Recibidas (Mes)</p>
                <p className="text-xl font-bold text-emerald-600">{stats?.compras_mes_count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Histórico</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(stats?.total_historico || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="estado-filter">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="recibida">Recibidas</SelectItem>
                <SelectItem value="cancelada">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Compras List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
        </div>
      ) : compras.length > 0 ? (
        <Card className="border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Orden</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compras.map((compra) => {
                const config = estadoConfig[compra.estado] || estadoConfig.pendiente;
                const IconEstado = config.icon;
                
                return (
                  <TableRow key={compra.id}>
                    <TableCell>
                      <span className="font-mono font-medium">{compra.numero_orden}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">{compra.proveedor_nombre}</p>
                        <p className="text-xs text-slate-500">RUC: {compra.proveedor_ruc}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(compra.fecha)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-teal-700">
                      {formatCurrency(compra.total)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn('gap-1', config.color)}>
                        <IconEstado className="h-3 w-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setSelectedCompra(compra);
                          setDetailOpen(true);
                        }}
                        data-testid={`view-compra-${compra.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <Truck className="h-16 w-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">No hay órdenes de compra</h3>
            <p className="text-slate-400 mb-4">Cree su primera orden de compra a proveedores</p>
            <Button onClick={() => setDialogOpen(true)} className="bg-teal-700 hover:bg-teal-800">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Orden de Compra
            </Button>
          </CardContent>
        </Card>
      )}

      {/* New Order Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-teal-700" />
              Nueva Orden de Compra
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-4">
            {/* Products Selection */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="space-y-3 mb-3">
                <div className="space-y-2">
                  <Label>Proveedor *</Label>
                  <Select value={selectedProveedor} onValueChange={setSelectedProveedor}>
                    <SelectTrigger data-testid="select-proveedor">
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {proveedores.map((prov) => (
                        <SelectItem key={prov.id} value={prov.id}>
                          {prov.razon_social} - {prov.ruc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Label className="mb-2">Productos</Label>
              <ScrollArea className="flex-1 border rounded-lg p-2">
                <div className="grid grid-cols-2 gap-2">
                  {productos.map((producto) => (
                    <button
                      key={producto.id}
                      onClick={() => addToCarrito(producto)}
                      className="p-3 text-left rounded-lg border hover:border-teal-500 hover:bg-teal-50 transition-colors"
                      data-testid={`add-producto-${producto.id}`}
                    >
                      <p className="font-medium text-sm truncate">{producto.nombre}</p>
                      <p className="text-xs text-slate-500">{producto.categoria}</p>
                      <p className="text-sm font-semibold text-teal-700 mt-1">
                        {formatCurrency(producto.precio_compra)}
                      </p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Cart */}
            <div className="w-full lg:w-80 flex flex-col min-h-0 border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-4">
              <h4 className="font-medium mb-3">Carrito de Compra</h4>
              
              <ScrollArea className="flex-1 mb-4">
                {itemsCarrito.length > 0 ? (
                  <div className="space-y-3 pr-2">
                    {itemsCarrito.map((item) => (
                      <div key={item.producto_id} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <p className="font-medium text-sm truncate flex-1">{item.producto_nombre}</p>
                          <button
                            onClick={() => removeFromCarrito(item.producto_id)}
                            className="text-red-500 hover:text-red-700 ml-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateCarritoItem(item.producto_id, item.cantidad - 1, item.precio_unitario)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            value={item.cantidad}
                            onChange={(e) => updateCarritoItem(item.producto_id, parseInt(e.target.value) || 0, item.precio_unitario)}
                            className="w-16 h-7 text-center"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateCarritoItem(item.producto_id, item.cantidad + 1, item.precio_unitario)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Label className="text-xs">Precio:</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.precio_unitario}
                            onChange={(e) => updateCarritoItem(item.producto_id, item.cantidad, parseFloat(e.target.value) || 0)}
                            className="w-24 h-7"
                          />
                        </div>
                        <p className="text-right text-sm font-semibold text-teal-700 mt-2">
                          {formatCurrency(item.subtotal)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Seleccione productos</p>
                  </div>
                )}
              </ScrollArea>

              {/* Additional Fields */}
              <div className="space-y-3 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_entrega">Fecha Entrega Estimada</Label>
                  <Input
                    id="fecha_entrega"
                    type="date"
                    value={fechaEntrega}
                    onChange={(e) => setFechaEntrega(e.target.value)}
                    data-testid="fecha-entrega-input"
                  />
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>IGV (18%)</span>
                  <span>{formatCurrency(igv)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>TOTAL</span>
                  <span className="text-teal-700">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setDialogOpen(false); clearCarrito(); }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateCompra} 
              disabled={submitting || !selectedProveedor || itemsCarrito.length === 0}
              className="bg-teal-700 hover:bg-teal-800"
              data-testid="crear-orden-btn"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Crear Orden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-teal-700" />
              Detalle de Orden
            </DialogTitle>
          </DialogHeader>
          
          {selectedCompra && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                {/* Header Info */}
                <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold">{selectedCompra.numero_orden}</span>
                    <Badge className={cn(estadoConfig[selectedCompra.estado]?.color)}>
                      {estadoConfig[selectedCompra.estado]?.label}
                    </Badge>
                  </div>
                  <p className="font-medium">{selectedCompra.proveedor_nombre}</p>
                  <p className="text-sm text-slate-500">RUC: {selectedCompra.proveedor_ruc}</p>
                  <p className="text-sm text-slate-500">Fecha: {formatDateTime(selectedCompra.fecha)}</p>
                  {selectedCompra.fecha_entrega_estimada && (
                    <p className="text-sm text-slate-500">
                      Entrega estimada: {selectedCompra.fecha_entrega_estimada}
                    </p>
                  )}
                  {selectedCompra.fecha_recepcion && (
                    <p className="text-sm text-emerald-600">
                      Recibida: {formatDateTime(selectedCompra.fecha_recepcion)}
                    </p>
                  )}
                </div>

                {/* Items */}
                <div>
                  <h4 className="font-medium text-sm text-slate-500 mb-2">Productos</h4>
                  <div className="space-y-2">
                    {selectedCompra.items?.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.producto_nombre}</p>
                          <p className="text-xs text-slate-500">
                            {item.cantidad} x {formatCurrency(item.precio_unitario)}
                          </p>
                        </div>
                        <p className="font-semibold text-teal-700">{formatCurrency(item.subtotal)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(selectedCompra.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>IGV (18%)</span>
                    <span>{formatCurrency(selectedCompra.igv)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200">
                    <span>TOTAL</span>
                    <span className="text-teal-700">{formatCurrency(selectedCompra.total)}</span>
                  </div>
                </div>

                {/* Actions */}
                {selectedCompra.estado === 'pendiente' && (
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setConfirmAction('recibir')}
                      data-testid="recibir-compra-btn"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Recibir Compra
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => setConfirmAction('cancelar')}
                      data-testid="cancelar-compra-btn"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                )}

                {selectedCompra.estado !== 'recibida' && (
                  <Button
                    variant="ghost"
                    className="w-full text-red-600 hover:bg-red-50"
                    onClick={() => setConfirmAction('eliminar')}
                    data-testid="eliminar-compra-btn"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Orden
                  </Button>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'recibir' && '¿Recibir esta compra?'}
              {confirmAction === 'cancelar' && '¿Cancelar esta orden?'}
              {confirmAction === 'eliminar' && '¿Eliminar esta orden?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'recibir' && 
                'Al recibir la compra, el inventario se actualizará automáticamente con los productos y cantidades indicadas.'}
              {confirmAction === 'cancelar' && 
                'La orden quedará marcada como cancelada y no afectará el inventario.'}
              {confirmAction === 'eliminar' && 
                'Esta acción eliminará permanentemente la orden de compra.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction === 'recibir') handleRecibir();
                if (confirmAction === 'cancelar') handleCancelar();
                if (confirmAction === 'eliminar') handleEliminar();
              }}
              className={cn(
                confirmAction === 'recibir' && 'bg-emerald-600 hover:bg-emerald-700',
                (confirmAction === 'cancelar' || confirmAction === 'eliminar') && 'bg-red-600 hover:bg-red-700'
              )}
              data-testid="confirm-action-btn"
            >
              {confirmAction === 'recibir' && 'Recibir y Actualizar Stock'}
              {confirmAction === 'cancelar' && 'Sí, Cancelar'}
              {confirmAction === 'eliminar' && 'Sí, Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Compras;
