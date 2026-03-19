import api from "@/lib/axios";

export const cotizacionesAPI = {
  getAll: async (params = {}) => {
    const { data } = await api.get("/cotizaciones", { params });
    return data;
  },
  
  getById: async (id) => {
    const { data } = await api.get(`/cotizaciones/${id}`);
    return data;
  },
  
  create: async (cotizacionData) => {
    const { data } = await api.post("/cotizaciones", cotizacionData);
    return data;
  },
  
  convertirAVenta: async (id, tipo_comprobante = "boleta") => {
    const { data } = await api.post(`/cotizaciones/${id}/convertir-venta?tipo_comprobante=${tipo_comprobante}`);
    return data;
  },
  
  downloadPDF: async (id) => {
    const response = await api.get(`/cotizaciones/${id}/pdf`, {
      responseType: "blob",
    });
    
    // Crear URL del blob y forzar descarga
    const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    const match = response.headers["content-disposition"]?.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : `Cotizacion_${id}.pdf`;
    
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};
