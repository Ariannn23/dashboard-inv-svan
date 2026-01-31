# Inversiones Svan ERP - PRD (Product Requirements Document)

## Resumen del Proyecto
Sistema ERP completo para gestión de inventario y ventas de alimentos para animales y abarrotes.

## Stack Tecnológico
- **Frontend:** React + Tailwind CSS + shadcn/ui
- **Backend:** FastAPI (Python)
- **Base de Datos:** MongoDB
- **Autenticación:** JWT con roles

## Usuarios del Sistema
| Usuario | Email | Contraseña | Rol |
|---------|-------|------------|-----|
| Administrador | admin@svan.com | admin123 | admin |
| Vendedor | vendedor@svan.com | vendedor123 | vendedor |

## Permisos por Rol
| Funcionalidad | Admin | Vendedor |
|---------------|-------|----------|
| Dashboard | ✅ | ✅ |
| Ver Productos | ✅ | ✅ |
| Crear/Editar/Eliminar Productos | ✅ | ❌ |
| Realizar Ventas (POS) | ✅ | ✅ |
| Ver Historial Ventas | ✅ | ✅ |
| Descargar Comprobantes PDF | ✅ | ✅ |
| Gestionar Clientes | ✅ | ✅ (crear/editar) |
| Eliminar Clientes | ✅ | ❌ |
| Gestionar Proveedores | ✅ | ❌ |
| Movimientos Inventario | ✅ | ❌ |

## Funcionalidades Implementadas ✅

### 1. Autenticación JWT
- Login con email/contraseña
- Tokens JWT con expiración 24h
- Control de roles (admin/vendedor)
- Logout

### 2. Dashboard
- Ventas del día y mes
- Productos con stock bajo
- Valor total del inventario
- Gráfico de ventas últimos 7 días
- Productos más vendidos (Pie Chart)
- Accesos rápidos

### 3. Gestión de Productos
- CRUD completo
- Categorías: Alimento para Animales, Abarrotes
- Control de stock y stock mínimo
- Alertas de stock bajo
- Búsqueda y filtros

### 4. Sistema POS (Ventas)
- Grid de productos táctil
- Carrito de compras
- Selección de cliente
- Tipo de comprobante: Boleta/Factura
- Cálculo automático: Subtotal, IGV (18%), Total
- Numeración correlativa simulada
- Descuento automático de stock
- Generación de PDF

### 5. Historial de Ventas
- Lista con filtros (tipo comprobante)
- Búsqueda
- Vista detallada
- Descarga de comprobantes PDF

### 6. Gestión de Clientes
- Tipos: Persona (DNI) / Empresa (RUC)
- CRUD completo
- Búsqueda y filtros

### 7. Gestión de Proveedores
- CRUD completo (solo admin)
- Búsqueda

### 8. Inventario (Kardex)
- Vista de stock actual
- Alertas de stock bajo/agotado
- Registro de entradas
- Registro de salidas
- Historial de movimientos

### 9. Módulo de Reportes y Análisis (NUEVO ✨)
- **Exportación Excel:**
  - Reporte de Ventas (con filtros de fecha y tipo comprobante)
  - Reporte de Inventario (stock actual + Kardex + alertas stock bajo)
  - Reporte de Clientes (con historial de compras)
- **Análisis de Rentabilidad:**
  - Ingresos, Costos, Ganancia Bruta y Margen Global
  - Top 10 productos más rentables con margen %
- **Ventas por Categoría:**
  - Gráfico Pie con distribución de ventas
  - Estadísticas de unidades vendidas
- **Ventas por Vendedor:**
  - Gráfico de barras por vendedor
  - Promedio por venta

### 10. UX/UI
- Diseño mobile-first
- Responsive 100%
- Sidebar en desktop
- Bottom navigation en mobile
- Tema claro con colores Teal/Emerald
- Fuentes: Outfit (headings), Inter (body)

## Estructura de APIs

```
POST /api/auth/login          - Autenticación
GET  /api/auth/me             - Usuario actual
POST /api/auth/register       - Registrar usuario (admin)

GET  /api/productos           - Listar productos
POST /api/productos           - Crear producto (admin)
PUT  /api/productos/{id}      - Actualizar producto (admin)
DELETE /api/productos/{id}    - Eliminar producto (admin)

GET  /api/clientes            - Listar clientes
POST /api/clientes            - Crear cliente
PUT  /api/clientes/{id}       - Actualizar cliente
DELETE /api/clientes/{id}     - Eliminar cliente (admin)

GET  /api/proveedores         - Listar proveedores
POST /api/proveedores         - Crear proveedor (admin)
PUT  /api/proveedores/{id}    - Actualizar proveedor (admin)
DELETE /api/proveedores/{id}  - Eliminar proveedor (admin)

POST /api/ventas              - Crear venta
GET  /api/ventas              - Listar ventas
GET  /api/ventas/{id}         - Detalle de venta
GET  /api/ventas/{id}/pdf     - Descargar PDF

GET  /api/inventario/movimientos  - Historial Kardex
POST /api/inventario/entrada      - Registrar entrada (admin)
POST /api/inventario/salida       - Registrar salida (admin)

GET  /api/dashboard/stats          - Estadísticas
GET  /api/dashboard/ventas-recientes
GET  /api/dashboard/productos-top
GET  /api/dashboard/ventas-por-periodo

# REPORTES (NUEVO ✨)
POST /api/reportes/ventas/excel       - Exportar ventas a Excel (con filtros)
GET  /api/reportes/inventario/excel   - Exportar inventario a Excel
GET  /api/reportes/clientes/excel     - Exportar clientes a Excel
GET  /api/reportes/rentabilidad       - Análisis de rentabilidad
GET  /api/reportes/ventas-por-categoria - Ventas agrupadas por categoría
GET  /api/reportes/ventas-por-vendedor  - Ventas agrupadas por vendedor

POST /api/seed                     - Datos iniciales
```

## Backlog P0/P1/P2

### P0 (Completado) ✅
- [x] Autenticación JWT
- [x] Dashboard con métricas
- [x] CRUD Productos
- [x] Sistema POS
- [x] Generación PDF
- [x] Control de inventario

### P1 (Siguiente Iteración)
- [ ] Integración con facturación electrónica real (SUNAT)
- [ ] Reportes avanzados exportables
- [ ] Gestión de compras a proveedores
- [ ] Historial de precios

### P2 (Futuro)
- [ ] Multi-sucursal
- [ ] Gestión de usuarios avanzada
- [ ] Notificaciones push
- [ ] Integración con pasarelas de pago
- [ ] App móvil nativa

## Notas Técnicas
- La facturación es SIMULADA para fines internos
- Los comprobantes PDF son documentos internos, no válidos fiscalmente
- La arquitectura permite migración futura a PostgreSQL sin cambios mayores
- El IGV está fijo al 18% (configurable en backend)

---
Fecha de creación: Enero 2026
Versión: 1.0.0 MVP
