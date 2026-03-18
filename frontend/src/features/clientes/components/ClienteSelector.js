import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";

const ClienteSelector = ({
  tipoComprobante,
  cliente,
  setCliente,
  clientes,
  loadingClientes,
  onNuevoCliente,
}) => {
  // Filter clients based on tipoComprobante
  const filteredClientes = React.useMemo(() => {
    if (!clientes) return [];
    if (tipoComprobante === "factura") {
      // Show only clients with RUC (11 digits)
      return clientes.filter((c) => c.documento && c.documento.length === 11);
    } else {
      // Show clients with DNI/CE/Passport (NOT 11 digits)
      // Assuming non-11 digits are personal documents
      return clientes.filter((c) => !c.documento || c.documento.length !== 11);
    }
  }, [clientes, tipoComprobante]);

  // Determine current value for Select
  const getCurrentValue = () => {
    if (
      tipoComprobante === "boleta" &&
      cliente?.nombre === "Cliente General"
    ) {
      return "general";
    }
    return cliente?.id?.toString() || "";
  };

  const handleValueChange = (value) => {
    if (value === "general") {
      setCliente({
        nombre: "Cliente General",
        documento: "00000000",
        id: null,
      });
    } else {
      const selectedCliente = clientes.find((c) => c.id.toString() === value);
      if (selectedCliente) {
        setCliente({
          id: selectedCliente.id,
          nombre: selectedCliente.nombre,
          documento: selectedCliente.documento,
        });
      }
    }
  };

  const isGeneral =
    tipoComprobante === "boleta" &&
    cliente?.nombre === "Cliente General";

  return (
    <>
      <div>
        <Label className="text-xs text-slate-500">Cliente *</Label>
        <Select value={getCurrentValue()} onValueChange={handleValueChange}>
          <SelectTrigger className="mt-1" data-testid="cliente-selector">
            <SelectValue placeholder="Seleccione un cliente" />
          </SelectTrigger>
          <SelectContent>
            {loadingClientes ? (
              <div className="flex items-center justify-center p-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <>
                {tipoComprobante === "boleta" && (
                  <SelectItem value="general">Cliente General</SelectItem>
                )}
                {filteredClientes.length > 0 ? (
                  filteredClientes.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.nombre} - {c.documento}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-slate-500">
                    {tipoComprobante === "factura"
                      ? "No hay empresas registradas"
                      : "No hay clientes registrados"}
                  </div>
                )}
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs text-slate-500">DNI/RUC</Label>
        <Input
          value={cliente?.documento ?? ""}
          readOnly={true}
          disabled={isGeneral}
          placeholder="00000000"
          className="mt-1 bg-slate-50"
          data-testid="cliente-documento-input"
        />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onNuevoCliente}
        data-testid="nuevo-cliente-btn"
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Registrar Nuevo Cliente
      </Button>
    </>
  );
};

export default ClienteSelector;
