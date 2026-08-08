import React, { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
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
  ChevronLeft,
  ChevronRight,
  Eye,
  Ban,
  CheckCircle2,
} from "lucide-react";

const initialFormState = {
  tipo: "persona",
  nombre: "",
  documento: "",
  telefono: "",
  email: "",
  direccion: "",
};

const Clientes = () => {
  const { isAdmin } = useAuthStore();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchClientes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await clientesAPI.getAll({
        search: search || undefined,
        tipo: tipoFilter && tipoFilter !== "all" ? tipoFilter : undefined,
        page,
        limit: 10,
      });
      setClientes(response.data.data);
      setTotalPages(response.data.pages || 1);
      setTotalItems(response.data.total || 0);
    } catch (error) {
      toast.error("Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  }, [search, tipoFilter, page]);

  useEffect(() => {
    const debounce = setTimeout(fetchClientes, 300);
    return () => clearTimeout(debounce);
  }, [fetchClientes]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, tipoFilter]);

  const handleOpenDialog = (cliente = null) => {
    if (cliente) {
      setFormData({
        tipo: cliente.tipo,
        nombre: cliente.nombre,
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

    if (!formData.nombre || !formData.documento) {
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
        await clientesAPI.update(selectedCliente.id, {
          ...data,
          activo: selectedCliente.activo // Preserve current active status
        });
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

  const handleDisable = async () => {
    if (!selectedCliente) return;

    setSubmitting(true);
    try {
      await clientesAPI.update(selectedCliente.id, {
        tipo: selectedCliente.tipo,
        nombre: selectedCliente.nombre,
        documento: selectedCliente.documento,
        telefono: selectedCliente.telefono,
        email: selectedCliente.email,
        direccion: selectedCliente.direccion,
        activo: false,
      });
      toast.success("Cliente inhabilitado correctamente");
      setDisableDialogOpen(false);
      setSelectedCliente(null);
      fetchClientes();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al inhabilitar cliente");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = (cliente) => {
    setSelectedCliente(cliente);
    setViewDialogOpen(true);
  };

  return (
    <div className="space-y-4 animate-fade-in" data-testid="clientes-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500">
            {totalItems} clientes registrados
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
                            {cliente.nombre}
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
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleViewDetails(cliente)}
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          onClick={() => handleOpenDialog(cliente)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {isAdmin() && cliente.activo && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setSelectedCliente(cliente);
                              setDisableDialogOpen(true);
                            }}
                            title="Inhabilitar"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                        {!cliente.activo && (
                            <Badge variant="outline" className="bg-slate-100 text-slate-400 border-slate-200">
                                Inactivo
                            </Badge>
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
                          {cliente.nombre}
                        </p>
                        <p className="font-mono text-sm text-slate-500">
                          {cliente.documento}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600"
                        onClick={() => handleViewDetails(cliente)}
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-600"
                        onClick={() => handleOpenDialog(cliente)}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {isAdmin() && cliente.activo && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          onClick={() => {
                            setSelectedCliente(cliente);
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
                      {cliente.telefono && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-rose-500" />
                          {cliente.telefono}
                        </span>
                      )}
                      {cliente.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-rose-500" />
                          {cliente.email}
                        </span>
                      )}
                    </div>
                    {!cliente.activo && (
                        <Badge variant="outline" className="bg-slate-100 text-slate-400 border-slate-200 w-fit">
                            Inactivo
                        </Badge>
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
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    nombre: e.target.value,
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
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                {selectedCliente ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Disable Confirmation */}
      <AlertDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Inhabilitar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará al cliente "{selectedCliente?.nombre}" como inactivo. 
              No podrá ser seleccionado en nuevas ventas, pero sus registros históricos se mantendrán.
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
              Detalle del Cliente
            </DialogTitle>
          </DialogHeader>

          {selectedCliente && (
            <div className="space-y-6 pt-2">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold transition-transform hover:scale-105",
                  selectedCliente.tipo === "persona" ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
                )}>
                  {selectedCliente.tipo === "persona" ? <User className="h-8 w-8" /> : <Building className="h-8 w-8" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedCliente.nombre}</h3>
                  <Badge variant={selectedCliente.activo ? "success" : "secondary"}>
                    {selectedCliente.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Documento</span>
                  <p className="font-mono text-slate-700 bg-white p-2 rounded border border-slate-100">
                    {selectedCliente.tipo === "persona" ? "DNI: " : "RUC: "} {selectedCliente.documento}
                  </p>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Información de Contacto</span>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2 rounded">
                      <Phone className="h-4 w-4 text-rose-500" />
                      <span>{selectedCliente.telefono || "No registrado"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2 rounded">
                      <Mail className="h-4 w-4 text-rose-500" />
                      <span>{selectedCliente.email || "No registrado"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Dirección</span>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {selectedCliente.direccion || "No registrada"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Fecha de Registro</span>
                  <p className="text-sm text-slate-500">
                    {new Date(selectedCliente.created_at).toLocaleString()}
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
                    handleOpenDialog(selectedCliente);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Cliente
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clientes;
