import { create } from "zustand";

export const useCartStore = create((set, get) => ({
  items: [],
  cliente: {
    nombre: "",
    documento: "00000000",
  },
  tipoComprobante: "boleta",

  // Datos derivados (getters en Zustand se manejan accediendo a la data cruda y calculando)
  // Pero lo expondremos como métodos sencillos para mantener la misma firma que el context
  getSubtotal: () => get().items.reduce((acc, item) => acc + item.subtotal, 0),
  getIgv: () => get().getSubtotal() * 0.18,
  getTotal: () => get().getSubtotal() + get().getIgv(),
  getItemCount: () => get().items.reduce((acc, item) => acc + item.cantidad, 0),

  setCliente: (cliente) => set({ cliente }),
  
  setTipoComprobante: (tipoComprobante) => set({ tipoComprobante }),

  addItem: (producto) => {
    const items = get().items;
    const existingIndex = items.findIndex((item) => item.producto_id === producto.id);

    if (existingIndex >= 0) {
      const updatedList = [...items];
      const newCantidad = updatedList[existingIndex].cantidad + 1;

      if (newCantidad > producto.stock) {
        return; // No hay stock
      }

      updatedList[existingIndex] = {
        ...updatedList[existingIndex],
        cantidad: newCantidad,
        subtotal: newCantidad * producto.precio_venta,
      };
      set({ items: updatedList });
    } else {
      if (producto.stock < 1) {
        return;
      }
      set({
        items: [
          ...items,
          {
            producto_id: producto.id,
            producto_nombre: producto.nombre,
            cantidad: 1,
            precio_unitario: producto.precio_venta,
            subtotal: producto.precio_venta,
            stock_disponible: producto.stock,
          },
        ]
      });
    }
  },

  removeItem: (productoId) => set({
    items: get().items.filter((item) => item.producto_id !== productoId)
  }),

  updateQuantity: (productoId, cantidad) => {
    if (cantidad < 1) {
      get().removeItem(productoId);
      return;
    }

    set({
      items: get().items.map((item) => {
        if (item.producto_id === productoId) {
          const newCantidad = Math.min(cantidad, item.stock_disponible);
          return {
            ...item,
            cantidad: newCantidad,
            subtotal: newCantidad * item.precio_unitario,
          };
        }
        return item;
      })
    });
  },

  clearCart: () => set({
    items: [],
    cliente: { nombre: "", documento: "00000000" },
    tipoComprobante: "boleta",
  }),

}));
