import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
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
  MoreVertical,
  Edit,
  Trash2,
  Truck,
  Loader2,
  Phone,
  Mail,
  User,
} from "lucide-react";

const initialFormState = {
  razon_social: "",
  ruc: "",
  telefono: "",
  email: "",
  direccion: "",
  contacto: "",
};

const Proveedores = () => {
  const { isAdmin } = useAuth();
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);

  const fetchProveedores = useCallback(async () => {
    try {
      const response = await proveedoresAPI.getAll({
        search: search || undefined,
      });
      setProveedores(response.data);
    } catch (error) {
      toast.error("Error al cargar proveedores");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const debounce = setTimeout(fetchProveedores, 300);
    return () => clearTimeout(debounce);
  }, [fetchProveedores]);

  const handleOpenDialog = (proveedor = null) => {
    if (proveedor) {
      setFormData({
        razon_social: proveedor.razon_social,
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

    if (!formData.razon_social || !formData.ruc) {
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
        await proveedoresAPI.update(selectedProveedor.id, data);
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

  const handleDelete = async () => {
    if (!selectedProveedor) return;

    try {
      await proveedoresAPI.delete(selectedProveedor.id);
      toast.success("Proveedor eliminado");
      setDeleteDialogOpen(false);
      setSelectedProveedor(null);
      fetchProveedores();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Error al eliminar proveedor",
      );
    }
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
            {proveedores.length} proveedores registrados
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
                            {proveedor.razon_social}
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            data-testid={`proveedor-menu-${proveedor.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleOpenDialog(proveedor)}
                            data-testid={`edit-proveedor-${proveedor.id}`}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedProveedor(proveedor);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-red-600"
                            data-testid={`delete-proveedor-${proveedor.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                          {proveedor.razon_social}
                        </p>
                        <p className="font-mono text-sm text-slate-500">
                          {proveedor.ruc}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleOpenDialog(proveedor)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedProveedor(proveedor);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                    {proveedor.contacto && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {proveedor.contacto}
                      </span>
                    )}
                    {proveedor.telefono && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {proveedor.telefono}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
              <Label htmlFor="razon_social">Razón Social *</Label>
              <Input
                id="razon_social"
                value={formData.razon_social}
                onChange={(e) =>
                  setFormData({ ...formData, razon_social: e.target.value })
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente al proveedor "
              {selectedProveedor?.razon_social}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-proveedor-btn"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Proveedores;
