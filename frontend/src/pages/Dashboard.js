import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { dashboardAPI } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/utils';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  Users,
  DollarSign,
  ArrowRight,
  Loader2,
} from 'lucide-react';

const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'teal' }) => {
  const colorClasses = {
    teal: 'bg-teal-50 text-teal-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-2xl md:text-3xl font-bold text-slate-900">{value}</p>
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          </div>
          <div className={`p-2 md:p-3 rounded-xl ${colorClasses[color]}`}>
            <Icon className="h-5 w-5 md:h-6 md:w-6" />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1 text-emerald-600 text-sm">
            <TrendingUp className="h-4 w-4" />
            <span>{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const CHART_COLORS = ['#0F766E', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [ventasRecientes, setVentasRecientes] = useState([]);
  const [productosTop, setProductosTop] = useState([]);
  const [ventasPeriodo, setVentasPeriodo] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, ventasRes, topRes, periodoRes] = await Promise.all([
          dashboardAPI.getStats(),
          dashboardAPI.getVentasRecientes(),
          dashboardAPI.getProductosTop(),
          dashboardAPI.getVentasPorPeriodo(7),
        ]);
        
        setStats(statsRes.data);
        setVentasRecientes(ventasRes.data);
        setProductosTop(topRes.data);
        setVentasPeriodo(periodoRes.data);
      } catch (error) {
        toast.error('Error al cargar datos del dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="dashboard-page">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ventas Hoy"
          value={formatCurrency(stats?.ventas_hoy || 0)}
          subtitle={`${stats?.ventas_hoy_count || 0} ventas`}
          icon={DollarSign}
          color="teal"
        />
        <StatCard
          title="Ventas Mes"
          value={formatCurrency(stats?.ventas_mes || 0)}
          subtitle={`${stats?.ventas_mes_count || 0} ventas`}
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="Stock Bajo"
          value={stats?.productos_stock_bajo || 0}
          subtitle="Productos por reabastecer"
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          title="Clientes"
          value={stats?.total_clientes || 0}
          subtitle={`${stats?.total_productos || 0} productos`}
          icon={Users}
          color="blue"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/ventas">
          <Button className="w-full h-14 bg-teal-700 hover:bg-teal-800 text-base" data-testid="quick-action-ventas">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Nueva Venta
          </Button>
        </Link>
        <Link to="/productos">
          <Button variant="outline" className="w-full h-14 text-base" data-testid="quick-action-productos">
            <Package className="h-5 w-5 mr-2" />
            Productos
          </Button>
        </Link>
        <Link to="/clientes">
          <Button variant="outline" className="w-full h-14 text-base" data-testid="quick-action-clientes">
            <Users className="h-5 w-5 mr-2" />
            Clientes
          </Button>
        </Link>
        <Link to="/inventario">
          <Button variant="outline" className="w-full h-14 text-base" data-testid="quick-action-inventario">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Inventario
          </Button>
        </Link>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Ventas Últimos 7 Días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ventasPeriodo}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="fecha" 
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => value.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value), 'Ventas']}
                    labelFormatter={(label) => `Fecha: ${label}`}
                  />
                  <Bar dataKey="total" fill="#0F766E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Products Chart */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {productosTop.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={productosTop}
                      dataKey="cantidad_vendida"
                      nameKey="nombre"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ nombre, percent }) => `${nombre?.substring(0, 10)}... (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {productosTop.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Unidades']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <p>No hay datos de ventas aún</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">Ventas Recientes</CardTitle>
          <Link to="/historial-ventas">
            <Button variant="ghost" size="sm" className="text-teal-700" data-testid="ver-todas-ventas-btn">
              Ver todas
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {ventasRecientes.length > 0 ? (
            <div className="space-y-3">
              {ventasRecientes.slice(0, 5).map((venta) => (
                <div
                  key={venta.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 truncate">
                      {venta.numero_comprobante}
                    </p>
                    <p className="text-xs text-slate-500">
                      {venta.cliente_nombre || 'Cliente General'} • {formatDateTime(venta.fecha)}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-teal-700">{formatCurrency(venta.total)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      venta.tipo_comprobante === 'boleta' 
                        ? 'bg-slate-100 text-slate-600' 
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {venta.tipo_comprobante === 'boleta' ? 'Boleta' : 'Factura'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay ventas registradas</p>
              <Link to="/ventas">
                <Button variant="link" className="text-teal-700 mt-2">
                  Realizar primera venta
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventory Value */}
      <Card className="border-slate-200 bg-gradient-to-r from-teal-700 to-emerald-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-100 text-sm">Valor Total del Inventario</p>
              <p className="text-3xl md:text-4xl font-bold mt-1">
                {formatCurrency(stats?.valor_inventario || 0)}
              </p>
              <p className="text-teal-100 text-sm mt-2">
                {stats?.total_productos || 0} productos en stock
              </p>
            </div>
            <Package className="h-16 w-16 text-white/20" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
