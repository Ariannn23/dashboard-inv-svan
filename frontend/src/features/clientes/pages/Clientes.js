import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { clientesAPI } from "../services/clientesAPI";
import { formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Users,
  User,
  Building,
  Loader2,
  Phone,
  Mail,
} from "lucide-react";

const initialFormState = {
  tipo: "persona",
  nombre_razon_social: "",
  documento: "",
  telefono: "",
  email: "",
  direccion: "",
};

const Clientes = () => {
  const { isAdmin } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);

  const fetchClientes = useCallback(async () => {
    try {
      const response = await clientesAPI.getAll({
        search: search || undefined,
        tipo: tipoFilter && tipoFilter !== "all" ? tipoFilter : undefined,
      });
      setClientes(response.data);
    } catch (error) {
      toast.error("Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  }, [search, tipoFilter]);

  useEffect(() => {
    const debounce = setTimeout(fetchClientes, 300);
    return () => clearTimeout(debounce);
  }, [fetchClientes]);

  const handleOpenDialog = (cliente = null) => {
    if (cliente) {
      setFormData({
        tipo: cliente.tipo,
        nombre_razon_social: cliente.nombre_razon_social,
        documento: cliente.documento,
        telefono: cliente.telefono || "",
        email: cliente.email || "",
        direccion: cliente.direccion || "",
      });
      setSelectedCliente(cliente);
    } else {
      setFormData(initialFormState);
      setSelectedCliente(null);
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nombre_razon_social || !formData.documento) {
      toast.error("Complete los campos requeridos");
      return;
    }

    // Validate document
    if (formData.tipo === "persona" && formData.documento.length !== 8) {
      toast.error("El DNI debe tener 8 dígitos");
      return;
    }
    if (formData.tipo === "empresa" && formData.documento.length !== 11) {
      toast.error("El RUC debe tener 11 dígitos");
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        ...formData,
        email: formData.email || null,
      };

      if (selectedCliente) {
        await clientesAPI.update(selectedCliente.id, data);
        toast.success("Cliente actualizado");
      } else {
        await clientesAPI.create(data);
        toast.success("Cliente creado");
      }

      setDialogOpen(false);
      fetchClientes();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al guardar cliente");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCliente) return;

    try {
      await clientesAPI.delete(selectedCliente.id);
      toast.success("Cliente eliminado");
      setDeleteDialogOpen(false);
      setSelectedCliente(null);
      fetchClientes();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al eliminar cliente");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in" data-testid="clientes-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500">
            {clientes.length} clientes registrados
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-rose-600 hover:bg-rose-700"
          data-testid="add-cliente-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o documento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="search-clientes-input"
              />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger
                className="w-full sm:w-40"
                data-testid="tipo-filter"
              >
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="persona">Persona</SelectItem>
                <SelectItem value="empresa">Empresa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
        </div>
      ) : clientes.length > 0 ? (
        <>
          {/* Desktop Table */}
          <Card className="border-slate-200 hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            cliente.tipo === "persona"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-blue-100 text-blue-700",
                          )}
                        >
                          {cliente.tipo === "persona" ? (
                            <User className="h-5 w-5" />
                          ) : (
                            <Building className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {cliente.nombre_razon_social}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {cliente.tipo === "persona" ? "Persona" : "Empresa"}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {cliente.documento}
                      </span>
                      <p className="text-xs text-slate-400">
                        {cliente.tipo === "persona" ? "DNI" : "RUC"}
                      </p>
                    </TableCell>
                    <TableCell>
                      {cliente.telefono && (
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <Phone className="h-3 w-3" />
                          {cliente.telefono}
                        </div>
                      )}
                      {cliente.email && (
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <Mail className="h-3 w-3" />
                          {cliente.email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {formatDate(cliente.created_at)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            data-testid={`cliente-menu-${cliente.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleOpenDialog(cliente)}
                            data-testid={`edit-cliente-${cliente.id}`}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {isAdmin() && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedCliente(cliente);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-red-600"
                              data-testid={`delete-cliente-${cliente.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          )}
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
            {clientes.map((cliente) => (
              <Card key={cliente.id} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                          cliente.tipo === "persona"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-blue-100 text-blue-700",
                        )}
                      >
                        {cliente.tipo === "persona" ? (
                          <User className="h-5 w-5" />
                        ) : (
                          <Building className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {cliente.nombre_razon_social}
                        </p>
                        <p className="font-mono text-sm text-slate-500">
                          {cliente.documento}
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
                          onClick={() => handleOpenDialog(cliente)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {isAdmin() && (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedCliente(cliente);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {(cliente.telefono || cliente.email) && (
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                      {cliente.telefono && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {cliente.telefono}
                        </span>
                      )}
                      {cliente.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {cliente.email}
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <Users className="h-16 w-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">
              No hay clientes
            </h3>
            <p className="text-slate-400 mb-4">
              {search
                ? "No se encontraron clientes con los filtros aplicados"
                : "Comience agregando su primer cliente"}
            </p>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-rose-600 hover:bg-rose-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Cliente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedCliente ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Cliente</Label>
              <Select
                value={formData.tipo}
                onValueChange={(v) =>
                  setFormData({ ...formData, tipo: v, documento: "" })
                }
              >
                <SelectTrigger data-testid="cliente-tipo-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="persona">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Persona Natural
                    </div>
                  </SelectItem>
                  <SelectItem value="empresa">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Empresa
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">
                {formData.tipo === "persona"
                  ? "Nombre Completo *"
                  : "Razón Social *"}
              </Label>
              <Input
                id="nombre"
                value={formData.nombre_razon_social}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    nombre_razon_social: e.target.value,
                  })
                }
                placeholder={
                  formData.tipo === "persona"
                    ? "Juan Pérez García"
                    : "Empresa SAC"
                }
                data-testid="cliente-nombre-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documento">
                {formData.tipo === "persona" ? "DNI *" : "RUC *"}
              </Label>
              <Input
                id="documento"
                value={formData.documento}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    documento: e.target.value.replace(/\D/g, ""),
                  })
                }
                placeholder={
                  formData.tipo === "persona" ? "12345678" : "20123456789"
                }
                maxLength={formData.tipo === "persona" ? 8 : 11}
                data-testid="cliente-documento-input"
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
                  placeholder="999888777"
                  data-testid="cliente-telefono-input"
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
                  placeholder="correo@ejemplo.com"
                  data-testid="cliente-email-input"
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
                placeholder="Av. Principal 123"
                data-testid="cliente-direccion-input"
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
                data-testid="save-cliente-btn"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {selectedCliente ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente al cliente "
              {selectedCliente?.nombre_razon_social}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-cliente-btn"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clientes;
