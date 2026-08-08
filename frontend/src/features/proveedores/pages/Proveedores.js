import React, { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { proveedoresAPI } from "../services/proveedoresAPI";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Edit,
  Trash2,
  Truck,
  Loader2,
  Phone,
  Mail,
  User,
  ChevronLeft,
  ChevronRight,
  Eye,
  Ban,
  CheckCircle2,
} from "lucide-react";

const initialFormState = {
  nombre: "",
  ruc: "",
  telefono: "",
  email: "",
  direccion: "",
  contacto: "",
};

const Proveedores = () => {
  const { isAdmin } = useAuthStore();
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchProveedores = useCallback(async () => {
    try {
      setLoading(true);
      const response = await proveedoresAPI.getAll({
        search: search || undefined,
        page,
        limit: 10,
      });
      setProveedores(response.data.data);
      setTotalPages(response.data.pages || 1);
      setTotalItems(response.data.total || 0);
    } catch (error) {
      toast.error("Error al cargar proveedores");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const debounce = setTimeout(fetchProveedores, 300);
    return () => clearTimeout(debounce);
  }, [fetchProveedores]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleOpenDialog = (proveedor = null) => {
    if (proveedor) {
      setFormData({
        nombre: proveedor.nombre,
        ruc: proveedor.ruc,
        telefono: proveedor.telefono || "",
        email: proveedor.email || "",
        direccion: proveedor.direccion || "",
        contacto: proveedor.contacto || "",
      });
      setSelectedProveedor(proveedor);
    } else {
      setFormData(initialFormState);
      setSelectedProveedor(null);
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nombre || !formData.ruc) {
      toast.error("Complete los campos requeridos");
      return;
    }

    if (formData.ruc.length !== 11) {
      toast.error("El RUC debe tener 11 dígitos");
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        ...formData,
        email: formData.email || null,
      };

      if (selectedProveedor) {
        await proveedoresAPI.update(selectedProveedor.id, {
          ...data,
          activo: selectedProveedor.activo // Preserve current active status
        });
        toast.success("Proveedor actualizado");
      } else {
        await proveedoresAPI.create(data);
        toast.success("Proveedor creado");
      }

      setDialogOpen(false);
      fetchProveedores();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al guardar proveedor");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisable = async () => {
    if (!selectedProveedor) return;

    setSubmitting(true);
    try {
      await proveedoresAPI.update(selectedProveedor.id, {
        ...selectedProveedor,
        activo: false,
      });
      toast.success("Proveedor inhabilitado correctamente");
      setDisableDialogOpen(false);
      setSelectedProveedor(null);
      fetchProveedores();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al inhabilitar proveedor");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = (proveedor) => {
    setSelectedProveedor(proveedor);
    setViewDialogOpen(true);
  };

  if (!isAdmin()) {
    return (
      <div className="space-y-4 animate-fade-in" data-testid="proveedores-page">
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <Truck className="h-16 w-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">
              Acceso Restringido
            </h3>
            <p className="text-slate-400">
              Solo los administradores pueden gestionar proveedores
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in" data-testid="proveedores-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Proveedores</h1>
          <p className="text-sm text-slate-500">
            {totalItems} proveedores registrados
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-rose-600 hover:bg-rose-700"
          data-testid="add-proveedor-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proveedor
        </Button>
      </div>

      {/* Search */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por razón social o RUC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="search-proveedores-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
        </div>
      ) : proveedores.length > 0 ? (
        <>
          {/* Desktop Table */}
          <Card className="border-slate-200 hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>RUC</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proveedores.map((proveedor) => (
                  <TableRow key={proveedor.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                          <Truck className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {proveedor.nombre}
                          </p>
                          {proveedor.contacto && (
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {proveedor.contacto}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{proveedor.ruc}</span>
                    </TableCell>
                    <TableCell>
                      {proveedor.telefono && (
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <Phone className="h-3 w-3" />
                          {proveedor.telefono}
                        </div>
                      )}
                      {proveedor.email && (
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <Mail className="h-3 w-3" />
                          {proveedor.email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {formatDate(proveedor.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleViewDetails(proveedor)}
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          onClick={() => handleOpenDialog(proveedor)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {isAdmin() && proveedor.activo && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setSelectedProveedor(proveedor);
                              setDisableDialogOpen(true);
                            }}
                            title="Inhabilitar"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                        {!proveedor.activo && (
                            <div className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-400 border border-slate-200">
                                Inactivo
                            </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {proveedores.map((proveedor) => (
              <Card key={proveedor.id} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {proveedor.nombre}
                        </p>
                        <p className="font-mono text-sm text-slate-500">
                          {proveedor.ruc}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600"
                        onClick={() => handleViewDetails(proveedor)}
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-600"
                        onClick={() => handleOpenDialog(proveedor)}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {isAdmin() && proveedor.activo && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          onClick={() => {
                            setSelectedProveedor(proveedor);
                            setDisableDialogOpen(true);
                          }}
                          title="Inhabilitar"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                      {proveedor.contacto && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-rose-500" />
                          {proveedor.contacto}
                        </span>
                      )}
                      {proveedor.telefono && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-rose-500" />
                          {proveedor.telefono}
                        </span>
                      )}
                    </div>
                    {!proveedor.activo && (
                      <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-400 border border-slate-200 w-fit">
                        Inactivo
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 mt-4 pt-4">
              <span className="text-sm text-slate-500">
                Página {page} de {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <Truck className="h-16 w-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">
              No hay proveedores
            </h3>
            <p className="text-slate-400 mb-4">
              {search
                ? "No se encontraron proveedores"
                : "Comience agregando su primer proveedor"}
            </p>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-rose-600 hover:bg-rose-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Proveedor
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedProveedor ? "Editar Proveedor" : "Nuevo Proveedor"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Razón Social *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                placeholder="Distribuidora SAC"
                data-testid="proveedor-razon-social-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ruc">RUC *</Label>
              <Input
                id="ruc"
                value={formData.ruc}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ruc: e.target.value.replace(/\D/g, ""),
                  })
                }
                placeholder="20123456789"
                maxLength={11}
                data-testid="proveedor-ruc-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contacto">Persona de Contacto</Label>
              <Input
                id="contacto"
                value={formData.contacto}
                onChange={(e) =>
                  setFormData({ ...formData, contacto: e.target.value })
                }
                placeholder="Juan Pérez"
                data-testid="proveedor-contacto-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) =>
                    setFormData({ ...formData, telefono: e.target.value })
                  }
                  placeholder="016543210"
                  data-testid="proveedor-telefono-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="correo@proveedor.com"
                  data-testid="proveedor-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={formData.direccion}
                onChange={(e) =>
                  setFormData({ ...formData, direccion: e.target.value })
                }
                placeholder="Av. Industrial 456"
                data-testid="proveedor-direccion-input"
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
                className="bg-rose-600 hover:bg-rose-700"
                data-testid="save-proveedor-btn"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {selectedProveedor ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Disable Confirmation */}
      <AlertDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Inhabilitar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará al proveedor "{selectedProveedor?.nombre}" como inactivo. 
              No podrá ser seleccionado en nuevas compras, pero sus registros históricos se mantendrán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDisable();
              }}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
              Sí, inhabilitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-rose-600" />
              Detalle del Proveedor
            </DialogTitle>
          </DialogHeader>

          {selectedProveedor && (
            <div className="space-y-6 pt-2">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-2xl font-bold transition-transform hover:scale-105">
                  <Truck className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedProveedor.nombre}</h3>
                  <div className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    selectedProveedor.activo ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-slate-100 text-slate-800 border-slate-200"
                  }`}>
                    {selectedProveedor.activo ? "Activo" : "Inactivo"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">RUC</span>
                  <p className="font-mono text-slate-700 bg-white p-2 rounded border border-slate-100">
                    {selectedProveedor.ruc}
                  </p>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Información de Contacto</span>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2 rounded">
                      <User className="h-4 w-4 text-rose-500" />
                      <span>{selectedProveedor.contacto || "No registrado"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2 rounded">
                      <Phone className="h-4 w-4 text-rose-500" />
                      <span>{selectedProveedor.telefono || "No registrado"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2 rounded">
                      <Mail className="h-4 w-4 text-rose-500" />
                      <span>{selectedProveedor.email || "No registrado"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Dirección</span>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {selectedProveedor.direccion || "No registrada"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Fecha de Registro</span>
                  <p className="text-sm text-slate-500">
                    {new Date(selectedProveedor.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setViewDialogOpen(false)} className="w-full sm:w-auto">
                  Cerrar
                </Button>
                <Button 
                  className="bg-rose-600 hover:bg-rose-700 w-full sm:w-auto"
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleOpenDialog(selectedProveedor);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Proveedor
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Proveedores;
