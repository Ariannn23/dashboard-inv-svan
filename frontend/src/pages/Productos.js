import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { productosAPI, proveedoresAPI } from '../lib/api';
import { formatCurrency, cn } from '../lib/utils';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
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
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  Loader2,
  Filter,
} from 'lucide-react';

const CATEGORIAS = ['Alimento para Animales', 'Abarrotes'];
const UNIDADES = ['unidad', 'bolsa', 'paquete', 'botella', 'lata', 'caja', 'kg', 'litro'];

const initialFormState = {
  nombre: '',
  categoria: 'Alimento para Animales',
  precio_compra: '',
  precio_venta: '',
  stock: '',
  stock_minimo: '5',
  unidad: 'unidad',
  proveedor_id: '',
  descripcion: '',
};

const ProductCard = ({ producto, onEdit, onDelete, isAdmin }) => {
  const stockBajo = producto.stock <= producto.stock_minimo;

  return (
    <Card className="border-slate-200 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 truncate">{producto.nombre}</h3>
              {stockBajo && (
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
              )}
            </div>
            <Badge variant="outline" className="mt-1 text-xs">
              {producto.categoria}
            </Badge>
          </div>
          
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`producto-menu-${producto.id}`}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(producto)} data-testid={`edit-producto-${producto.id}`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(producto)} 
                  className="text-red-600"
                  data-testid={`delete-producto-${producto.id}`}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-500">Precio Venta</p>
            <p className="font-semibold text-teal-700">{formatCurrency(producto.precio_venta)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Precio Compra</p>
            <p className="font-medium text-slate-600">{formatCurrency(producto.precio_compra)}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className={cn(
            'px-2 py-1 rounded-lg text-sm font-medium',
            stockBajo ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
          )}>
            Stock: {producto.stock} {producto.unidad}
          </div>
          <span className="text-xs text-slate-400">Mín: {producto.stock_minimo}</span>
        </div>
      </CardContent>
    </Card>
  );
};

const Productos = () => {
  const { isAdmin } = useAuth();
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [stockBajoFilter, setStockBajoFilter] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [productosRes, proveedoresRes] = await Promise.all([
        productosAPI.getAll({ 
          search: search || undefined, 
          categoria: categoriaFilter || undefined,
          stock_bajo: stockBajoFilter || undefined
        }),
        proveedoresAPI.getAll(),
      ]);
      setProductos(productosRes.data);
      setProveedores(proveedoresRes.data);
    } catch (error) {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, [search, categoriaFilter, stockBajoFilter]);

  useEffect(() => {
    const debounce = setTimeout(fetchData, 300);
    return () => clearTimeout(debounce);
  }, [fetchData]);

  const handleOpenDialog = (producto = null) => {
    if (producto) {
      setFormData({
        nombre: producto.nombre,
        categoria: producto.categoria,
        precio_compra: producto.precio_compra.toString(),
        precio_venta: producto.precio_venta.toString(),
        stock: producto.stock.toString(),
        stock_minimo: producto.stock_minimo.toString(),
        unidad: producto.unidad,
        proveedor_id: producto.proveedor_id || '',
        descripcion: producto.descripcion || '',
      });
      setSelectedProducto(producto);
    } else {
      setFormData(initialFormState);
      setSelectedProducto(null);
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.precio_compra || !formData.precio_venta) {
      toast.error('Complete los campos requeridos');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        ...formData,
        precio_compra: parseFloat(formData.precio_compra),
        precio_venta: parseFloat(formData.precio_venta),
        stock: parseInt(formData.stock) || 0,
        stock_minimo: parseInt(formData.stock_minimo) || 5,
        proveedor_id: formData.proveedor_id || null,
      };

      if (selectedProducto) {
        await productosAPI.update(selectedProducto.id, data);
        toast.success('Producto actualizado');
      } else {
        await productosAPI.create(data);
        toast.success('Producto creado');
      }
      
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar producto');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProducto) return;
    
    try {
      await productosAPI.delete(selectedProducto.id);
      toast.success('Producto eliminado');
      setDeleteDialogOpen(false);
      setSelectedProducto(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar producto');
    }
  };

  const stockBajoCount = productos.filter(p => p.stock <= p.stock_minimo).length;

  return (
    <div className="space-y-4 animate-fade-in" data-testid="productos-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Productos</h1>
          <p className="text-sm text-slate-500">{productos.length} productos registrados</p>
        </div>
        {isAdmin() && (
          <Button onClick={() => handleOpenDialog()} className="bg-teal-700 hover:bg-teal-800" data-testid="add-producto-btn">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Button>
        )}
      </div>

      {/* Filters */}
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
                data-testid="search-productos-input"
              />
            </div>
            <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="categoria-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {CATEGORIAS.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={stockBajoFilter ? 'default' : 'outline'}
              onClick={() => setStockBajoFilter(!stockBajoFilter)}
              className={cn(stockBajoFilter && 'bg-amber-500 hover:bg-amber-600')}
              data-testid="stock-bajo-filter-btn"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Stock Bajo ({stockBajoCount})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
        </div>
      ) : productos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {productos.map((producto) => (
            <ProductCard
              key={producto.id}
              producto={producto}
              isAdmin={isAdmin()}
              onEdit={handleOpenDialog}
              onDelete={(p) => {
                setSelectedProducto(p);
                setDeleteDialogOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <Package className="h-16 w-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">No hay productos</h3>
            <p className="text-slate-400 mb-4">
              {search || categoriaFilter ? 'No se encontraron productos con los filtros aplicados' : 'Comience agregando su primer producto'}
            </p>
            {isAdmin() && !search && !categoriaFilter && (
              <Button onClick={() => handleOpenDialog()} className="bg-teal-700 hover:bg-teal-800">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Producto
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProducto ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Nombre del producto"
                data-testid="producto-nombre-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select 
                  value={formData.categoria} 
                  onValueChange={(v) => setFormData({ ...formData, categoria: v })}
                >
                  <SelectTrigger data-testid="producto-categoria-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unidad</Label>
                <Select 
                  value={formData.unidad} 
                  onValueChange={(v) => setFormData({ ...formData, unidad: v })}
                >
                  <SelectTrigger data-testid="producto-unidad-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="precio_compra">Precio Compra *</Label>
                <Input
                  id="precio_compra"
                  type="number"
                  step="0.01"
                  value={formData.precio_compra}
                  onChange={(e) => setFormData({ ...formData, precio_compra: e.target.value })}
                  placeholder="0.00"
                  data-testid="producto-precio-compra-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precio_venta">Precio Venta *</Label>
                <Input
                  id="precio_venta"
                  type="number"
                  step="0.01"
                  value={formData.precio_venta}
                  onChange={(e) => setFormData({ ...formData, precio_venta: e.target.value })}
                  placeholder="0.00"
                  data-testid="producto-precio-venta-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Stock Actual</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                  data-testid="producto-stock-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock_minimo">Stock Mínimo</Label>
                <Input
                  id="stock_minimo"
                  type="number"
                  value={formData.stock_minimo}
                  onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                  placeholder="5"
                  data-testid="producto-stock-minimo-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Proveedor</Label>
              <Select 
                value={formData.proveedor_id} 
                onValueChange={(v) => setFormData({ ...formData, proveedor_id: v })}
              >
                <SelectTrigger data-testid="producto-proveedor-select">
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin proveedor</SelectItem>
                  {proveedores.map((prov) => (
                    <SelectItem key={prov.id} value={prov.id}>{prov.razon_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-teal-700 hover:bg-teal-800" data-testid="save-producto-btn">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {selectedProducto ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el producto "{selectedProducto?.nombre}". Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" data-testid="confirm-delete-producto-btn">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Productos;
