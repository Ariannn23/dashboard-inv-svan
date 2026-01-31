import React, { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { seedAPI } from "./lib/api";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Productos from "./pages/Productos";
import Clientes from "./pages/Clientes";
import Proveedores from "./pages/Proveedores";
import Ventas from "./pages/Ventas";
import HistorialVentas from "./pages/HistorialVentas";
import Inventario from "./pages/Inventario";
import Reportes from "./pages/Reportes";
import Compras from "./pages/Compras";

// Layout
import MainLayout from "./components/layout/MainLayout";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// App Routes
const AppRoutes = () => {
  useEffect(() => {
    // Seed initial data
    seedAPI.seed().catch(() => {});
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <CartProvider>
              <MainLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/productos" element={<Productos />} />
                  <Route path="/clientes" element={<Clientes />} />
                  <Route path="/proveedores" element={<Proveedores />} />
                  <Route path="/ventas" element={<Ventas />} />
                  <Route path="/historial-ventas" element={<HistorialVentas />} />
                  <Route path="/inventario" element={<Inventario />} />
                  <Route path="/reportes" element={<Reportes />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </MainLayout>
            </CartProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
