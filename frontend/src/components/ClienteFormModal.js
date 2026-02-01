import React, { useState } from "react";
import { clientesAPI } from "../lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Loader2, UserPlus } from "lucide-react";

const ClienteFormModal = ({
  open,
  onOpenChange,
  onClienteCreated,
  tipoComprobante,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre_razon_social: "",
    tipo_documento: "DNI",
    documento: "",
    direccion: "",
    telefono: "",
    email: "",
  });

  // Determine allowed document types based on tipoComprobante
  const allowedDocTypes = React.useMemo(() => {
    if (tipoComprobante === "factura") {
      return [{ value: "RUC", label: "RUC" }];
    } else {
      return [
        { value: "DNI", label: "DNI" },
        { value: "CE", label: "Carnet de Extranjería" },
        { value: "PASAPORTE", label: "Pasaporte" },
      ];
    }
  }, [tipoComprobante]);

  // Set default document type when modal opens or types change
  React.useEffect(() => {
    if (open) {
      if (tipoComprobante === "factura") {
        setFormData((prev) => ({
          ...prev,
          tipo_documento: "RUC",
          documento: "", // Clear document/name on mode switch to avoid errors
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          tipo_documento: "DNI",
          documento: "",
        }));
      }
    }
  }, [open, tipoComprobante]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nombre_razon_social.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    if (!formData.documento.trim()) {
      toast.error("El documento es requerido");
      return;
    }

    setLoading(true);
    try {
      // Prepare payload matching backend schema
      const payload = {
        tipo: formData.tipo_documento === "RUC" ? "empresa" : "persona",
        nombre_razon_social: formData.nombre_razon_social,
        documento: formData.documento,
        direccion: formData.direccion || null,
        telefono: formData.telefono || null,
        email: formData.email || null,
      };

      const response = await clientesAPI.create(payload);
      toast.success("Cliente registrado exitosamente");

      // Reset form
      setFormData({
        nombre_razon_social: "",
        tipo_documento: "DNI",
        documento: "",
        direccion: "",
        telefono: "",
        email: "",
      });

      // Notify parent and close
      if (onClienteCreated) {
        onClienteCreated({ ...payload, id: response.data.id });
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating client:", error);
      let errorMessage = "Error al registrar cliente";

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
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-rose-600" />
            Registrar Nuevo Cliente
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nombre">Nombre / Razón Social *</Label>
            <Input
              id="nombre"
              value={formData.nombre_razon_social}
              onChange={(e) =>
                handleChange("nombre_razon_social", e.target.value)
              }
              placeholder="Ingrese nombre o razón social"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tipo_documento">Tipo de Documento *</Label>
              <Select
                value={formData.tipo_documento}
                onValueChange={(value) => handleChange("tipo_documento", value)}
              >
                <SelectTrigger id="tipo_documento">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedDocTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="documento">Número *</Label>
              <Input
                id="documento"
                value={formData.documento}
                onChange={(e) => handleChange("documento", e.target.value)}
                placeholder={
                  formData.tipo_documento === "RUC" ? "20XXXXXXXXX" : "12345678"
                }
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              value={formData.direccion}
              onChange={(e) => handleChange("direccion", e.target.value)}
              placeholder="Ingrese dirección (opcional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) => handleChange("telefono", e.target.value)}
                placeholder="999999999"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="email@ejemplo.com"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-rose-600 hover:bg-rose-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Registrar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClienteFormModal;
