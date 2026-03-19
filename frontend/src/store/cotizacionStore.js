import { create } from "zustand";

const calculateTotals = (items) => {
  const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0);
  const igv = subtotal * 0.18;
  const total = subtotal + igv;
  const itemCount = items.reduce((acc, item) => acc + item.cantidad, 0);
  return { subtotal, igv, total, itemCount };
};

export const useCotizacionStore = create((set, get) => ({
  items: [],
  cliente: {
    nombre: "",
    documento: "00000000",
  },
  notas: "",
  subtotal: 0,
  igv: 0,
  total: 0,
  itemCount: 0,

  getSubtotal: () => get().subtotal,
  getIgv: () => get().igv,
  getTotal: () => get().total,
  getItemCount: () => get().itemCount,

  setCliente: (cliente) => set({ cliente }),
  setNotas: (notas) => set({ notas }),

  addItem: (producto) => {
    const items = get().items;
    const existingIndex = items.findIndex((item) => item.producto_id === producto.id);

    if (existingIndex >= 0) {
      const updatedList = [...items];
      const newCantidad = updatedList[existingIndex].cantidad + 1;

      updatedList[existingIndex] = {
        ...updatedList[existingIndex],
        cantidad: newCantidad,
        subtotal: newCantidad * producto.precio_venta,
      };
      set({ items: updatedList, ...calculateTotals(updatedList) });
    } else {
      const newItems = [
          ...items,
          {
            producto_id: producto.id,
            producto_nombre: producto.nombre,
            cantidad: 1,
            precio_unitario: producto.precio_venta,
            subtotal: producto.precio_venta,
          },
      ];
      set({
        items: newItems,
        ...calculateTotals(newItems)
      });
    }
  },

  removeItem: (productoId) => {
    const newItems = get().items.filter((item) => item.producto_id !== productoId);
    set({ items: newItems, ...calculateTotals(newItems) });
  },

  updateQuantity: (productoId, cantidad) => {
    if (cantidad < 1) {
      get().removeItem(productoId);
      return;
    }

    const newItems = get().items.map((item) => {
        if (item.producto_id === productoId) {
          return {
            ...item,
            cantidad: cantidad,
            subtotal: cantidad * item.precio_unitario,
          };
        }
        return item;
      });
      
    set({
      items: newItems,
      ...calculateTotals(newItems)
    });
  },

  clearCotizacion: () => set({
    items: [],
    cliente: { nombre: "", documento: "00000000" },
    notas: "",
    subtotal: 0,
    igv: 0,
    total: 0,
    itemCount: 0,
  }),

}));
