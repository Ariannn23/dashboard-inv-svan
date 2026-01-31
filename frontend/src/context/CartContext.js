import React, { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [tipoComprobante, setTipoComprobante] = useState('boleta');

  const addItem = useCallback((producto) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.producto_id === producto.id);
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        const newCantidad = updated[existingIndex].cantidad + 1;
        
        if (newCantidad > producto.stock) {
          return prev;
        }
        
        updated[existingIndex] = {
          ...updated[existingIndex],
          cantidad: newCantidad,
          subtotal: newCantidad * producto.precio_venta,
        };
        return updated;
      }
      
      if (producto.stock < 1) {
        return prev;
      }
      
      return [
        ...prev,
        {
          producto_id: producto.id,
          producto_nombre: producto.nombre,
          cantidad: 1,
          precio_unitario: producto.precio_venta,
          subtotal: producto.precio_venta,
          stock_disponible: producto.stock,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((productoId) => {
    setItems((prev) => prev.filter((item) => item.producto_id !== productoId));
  }, []);

  const updateQuantity = useCallback((productoId, cantidad) => {
    if (cantidad < 1) {
      removeItem(productoId);
      return;
    }
    
    setItems((prev) =>
      prev.map((item) => {
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
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
    setCliente(null);
    setTipoComprobante('boleta');
  }, []);

  const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0);
  const igv = subtotal * 0.18;
  const total = subtotal + igv;
  const itemCount = items.reduce((acc, item) => acc + item.cantidad, 0);

  const value = {
    items,
    cliente,
    tipoComprobante,
    subtotal,
    igv,
    total,
    itemCount,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    setCliente,
    setTipoComprobante,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
