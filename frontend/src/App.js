import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";
import api from "@/lib/axios";

// Pages
import Login from "./features/auth/pages/Login";
import Dashboard from "./features/dashboard/pages/Dashboard";
import Productos from "./features/productos/pages/Productos";
import Clientes from "./features/clientes/pages/Clientes";
import Proveedores from "./features/proveedores/pages/Proveedores";
import Ventas from "./features/ventas/pages/Ventas";
import HistorialVentas from "./features/ventas/pages/HistorialVentas";
import Cotizaciones from "./features/cotizaciones/pages/Cotizaciones";
import HistorialCotizaciones from "./features/cotizaciones/pages/HistorialCotizaciones";
import Inventario from "./features/inventario/pages/Inventario";
import Reportes from "./features/reportes/pages/Reportes";
import Compras from "./features/compras/pages/Compras";

// Layout
import MainLayout from "@/components/layout/MainLayout";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuthStore();

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
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/productos" element={<Productos />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/proveedores" element={<Proveedores />} />
                <Route path="/ventas" element={<Ventas />} />
                <Route
                  path="/historial-ventas"
                  element={<HistorialVentas />}
                />
                <Route path="/cotizaciones" element={<Cotizaciones />} />
                <Route
                  path="/historial-cotizaciones"
                  element={<HistorialCotizaciones />}
                />
                <Route path="/inventario" element={<Inventario />} />
                <Route path="/reportes" element={<Reportes />} />
                <Route path="/compras" element={<Compras />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

function App() {
  // P9: Autollenar BD en entorno local
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      api.post("/seed")
        .then(() => console.log("🌱 Seed ejecutado silenciosamente"))
        .catch(() => {});
    }
  }, []);

  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster position="top-right" richColors closeButton />
    </BrowserRouter>
  );
}

export default App;
