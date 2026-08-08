import api from "@/lib/axios";

export const notasCreditoAPI = {
  getAll: (params) => api.get("/notas-credito", { params }),
  getById: (id) => api.get(`/notas-credito/${id}`),
  create: (data) => api.post("/notas-credito", data),
  downloadPDF: async (id) => {
    const response = await api.get(`/notas-credito/${id}/pdf`, {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `nota_credito_${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};
