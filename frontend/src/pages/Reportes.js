import React, { useState, useEffect } from "react";
import { reportesAPI } from "../lib/api";
import { formatCurrency, cn } from "../lib/utils";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
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
  Legend,
} from "recharts";
import {
  FileSpreadsheet,
  Download,
  TrendingUp,
  Package,
  Users,
  DollarSign,
  Loader2,
  BarChart3,
  PieChartIcon,
  Calendar,
  Filter,
} from "lucide-react";

const CHART_COLORS = [
  "#E11D48",
  "#10B981",
  "#F59E0B",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
];

const Reportes = () => {
  const [activeTab, setActiveTab] = useState("ventas");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(null);

  // Filtros para ventas
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [tipoComprobante, setTipoComprobante] = useState("all");

  // Datos de reportes
  const [rentabilidad, setRentabilidad] = useState(null);
  const [ventasPorCategoria, setVentasPorCategoria] = useState([]);
  const [ventasPorVendedor, setVentasPorVendedor] = useState([]);

  useEffect(() => {
    fetchReportesData();
  }, []);

  const fetchReportesData = async () => {
    setLoading(true);
    try {
      const [rentRes, catRes, vendRes] = await Promise.all([
        reportesAPI.getRentabilidad(),
        reportesAPI.getVentasPorCategoria(),
        reportesAPI.getVentasPorVendedor(),
      ]);
      setRentabilidad(rentRes.data);
      setVentasPorCategoria(catRes.data);
      setVentasPorVendedor(vendRes.data);
    } catch (error) {
      toast.error("Error al cargar datos de reportes");
    } finally {
      setLoading(false);
    }
  };

  const handleExportVentas = async () => {
    setExporting("ventas");
    try {
      const response = await reportesAPI.exportarVentasExcel({
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        tipo_comprobante: tipoComprobante === "all" ? null : tipoComprobante,
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `reporte_ventas_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Reporte de ventas exportado");
    } catch (error) {
      toast.error("Error al exportar reporte");
    } finally {
      setExporting(null);
    }
  };

  const handleExportInventario = async () => {
    setExporting("inventario");
    try {
      const response = await reportesAPI.exportarInventarioExcel();

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `reporte_inventario_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Reporte de inventario exportado");
    } catch (error) {
      toast.error("Error al exportar reporte");
    } finally {
      setExporting(null);
    }
  };

  const handleExportClientes = async () => {
    setExporting("clientes");
    try {
      const response = await reportesAPI.exportarClientesExcel();

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `reporte_clientes_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Reporte de clientes exportado");
    } catch (error) {
      toast.error("Error al exportar reporte");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="reportes-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Reportes y Análisis
          </h1>
          <p className="text-sm text-slate-500">
            Exporta datos y analiza el rendimiento del negocio
          </p>
        </div>
      </div>

      {/* Quick Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700">
                <DollarSign className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">
                  Reporte de Ventas
                </h3>
                <p className="text-sm text-slate-500">
                  Exporta historial de ventas a Excel
                </p>
              </div>
            </div>
            <Button
              onClick={handleExportVentas}
              disabled={exporting === "ventas"}
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700"
              data-testid="export-ventas-btn"
            >
              {exporting === "ventas" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              Exportar Ventas
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100 text-blue-700">
                <Package className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">
                  Reporte de Inventario
                </h3>
                <p className="text-sm text-slate-500">
                  Stock actual, Kardex y alertas
                </p>
              </div>
            </div>
            <Button
              onClick={handleExportInventario}
              disabled={exporting === "inventario"}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
              data-testid="export-inventario-btn"
            >
              {exporting === "inventario" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              Exportar Inventario
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-100 text-orange-700">
                <Users className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">
                  Reporte de Clientes
                </h3>
                <p className="text-sm text-slate-500">
                  Lista con historial de compras
                </p>
              </div>
            </div>
            <Button
              onClick={handleExportClientes}
              disabled={exporting === "clientes"}
              className="w-full mt-4 bg-orange-600 hover:bg-orange-700"
              data-testid="export-clientes-btn"
            >
              {exporting === "clientes" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              Exportar Clientes
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Filters for Sales Export */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros para Exportación de Ventas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_inicio">Fecha Inicio</Label>
              <Input
                id="fecha_inicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                data-testid="fecha-inicio-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_fin">Fecha Fin</Label>
              <Input
                id="fecha_fin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                data-testid="fecha-fin-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo Comprobante</Label>
              <Select
                value={tipoComprobante}
                onValueChange={setTipoComprobante}
              >
                <SelectTrigger data-testid="tipo-comprobante-select">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="boleta">Boletas</SelectItem>
                  <SelectItem value="factura">Facturas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setFechaInicio("");
                  setFechaFin("");
                  setTipoComprobante("all");
                }}
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Analytics */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ventas" data-testid="tab-analytics-ventas">
            <BarChart3 className="h-4 w-4 mr-2" />
            Análisis Ventas
          </TabsTrigger>
          <TabsTrigger
            value="rentabilidad"
            data-testid="tab-analytics-rentabilidad"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Rentabilidad
          </TabsTrigger>
          <TabsTrigger
            value="categorias"
            data-testid="tab-analytics-categorias"
          >
            <PieChartIcon className="h-4 w-4 mr-2" />
            Por Categoría
          </TabsTrigger>
        </TabsList>

        {/* Ventas Tab */}
        <TabsContent value="ventas" className="mt-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
            </div>
          ) : (
            <>
              {/* Ventas por Vendedor */}
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base">
                    Ventas por Vendedor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ventasPorVendedor.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ventasPorVendedor} layout="vertical">
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#E2E8F0"
                          />
                          <XAxis
                            type="number"
                            tickFormatter={(v) => `S/ ${v}`}
                          />
                          <YAxis
                            type="category"
                            dataKey="vendedor"
                            width={100}
                          />
                          <Tooltip
                            formatter={(value) => [
                              formatCurrency(value),
                              "Total",
                            ]}
                          />
                          <Bar
                            dataKey="total"
                            fill="#E11D48"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <p>No hay datos de ventas aún</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Table de vendedores */}
              {ventasPorVendedor.length > 0 && (
                <Card className="border-slate-200">
                  <CardContent className="pt-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vendedor</TableHead>
                          <TableHead className="text-center">
                            N° Ventas
                          </TableHead>
                          <TableHead className="text-right">
                            Total Ventas
                          </TableHead>
                          <TableHead className="text-right">
                            Promedio por Venta
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ventasPorVendedor.map((v, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">
                              {v.vendedor}
                            </TableCell>
                            <TableCell className="text-center">
                              {v.ventas}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-emerald-700">
                              {formatCurrency(v.total)}
                            </TableCell>
                            <TableCell className="text-right text-slate-600">
                              {formatCurrency(v.total / v.ventas)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Rentabilidad Tab */}
        <TabsContent value="rentabilidad" className="mt-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
            </div>
          ) : rentabilidad ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-500">Ingresos Totales</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {formatCurrency(rentabilidad.resumen.total_ingresos)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-500">Costo de Ventas</p>
                    <p className="text-2xl font-bold text-slate-700">
                      {formatCurrency(rentabilidad.resumen.total_costo)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-500">Ganancia Bruta</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(rentabilidad.resumen.total_ganancia)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-500">Margen Global</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {rentabilidad.resumen.margen_global}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Products by Profit */}
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base">
                    Productos Más Rentables
                  </CardTitle>
                  <CardDescription>
                    Top 10 productos por ganancia total
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-center">
                            Margen %
                          </TableHead>
                          <TableHead className="text-center">
                            Vendidos
                          </TableHead>
                          <TableHead className="text-right">Ingresos</TableHead>
                          <TableHead className="text-right">Ganancia</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rentabilidad.productos.slice(0, 10).map((prod, i) => (
                          <TableRow key={prod.id || i}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{prod.nombre}</p>
                                <Badge
                                  variant="outline"
                                  className="text-xs mt-1"
                                >
                                  {prod.categoria}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                className={cn(
                                  prod.margen_porcentaje >= 30
                                    ? "bg-emerald-100 text-emerald-700"
                                    : prod.margen_porcentaje >= 15
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-red-100 text-red-700",
                                )}
                              >
                                {prod.margen_porcentaje}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {prod.cantidad_vendida}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(prod.ingresos)}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-emerald-600">
                              {formatCurrency(prod.ganancia_total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-slate-200">
              <CardContent className="py-16 text-center text-slate-400">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay datos de rentabilidad disponibles</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Categorías Tab */}
        <TabsContent value="categorias" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
            </div>
          ) : ventasPorCategoria.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base">
                    Distribución por Categoría
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={ventasPorCategoria}
                          dataKey="total"
                          nameKey="categoria"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ categoria, percent }) =>
                            `${categoria} (${(percent * 100).toFixed(0)}%)`
                          }
                        >
                          {ventasPorCategoria.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Category Stats */}
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base">
                    Estadísticas por Categoría
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {ventasPorCategoria.map((cat, i) => {
                      const maxTotal = Math.max(
                        ...ventasPorCategoria.map((c) => c.total),
                      );
                      const percentage = (cat.total / maxTotal) * 100;

                      return (
                        <div key={i} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor:
                                    CHART_COLORS[i % CHART_COLORS.length],
                                }}
                              />
                              <span className="font-medium text-sm">
                                {cat.categoria}
                              </span>
                            </div>
                            <span className="font-semibold text-teal-700">
                              {formatCurrency(cat.total)}
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                          <p className="text-xs text-slate-500">
                            {cat.cantidad} unidades vendidas
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-slate-200">
              <CardContent className="py-16 text-center text-slate-400">
                <PieChartIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay datos de ventas por categoría</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reportes;
