# SVAN ERP — Estado Actual y Roadmap Completo
> Documento de contexto para continuar desarrollo
> Última actualización: 18 marzo 2026

---

## 1. RESUMEN DEL PROYECTO

**Svan** es un sistema ERP B2B para compra y venta de alimento para animales (y abarrotes).
- **Repositorio:** `dashboard-inv-svan` (GitHub: Ariannn23)
- **Ruta local:** `C:\Users\arian\arian\Escritorio\Programacion\Portafolio\dashboard-inv-svan`
- **Estado:** En desarrollo activo — base sólida completada, listos para nuevos módulos

---

## 2. STACK TECNOLÓGICO ACTUAL

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Frontend | React 19 + CRA/CRACO (SPA) | Tailwind CSS, Shadcn UI, React Router 7 |
| Backend | FastAPI (Python asíncrono) | SQLAlchemy 2.0 async + asyncpg |
| Base de datos | PostgreSQL 18 local | Puerto 5432, BD: svan_db |
| Auth | JWT + Bcrypt | python-jose + passlib |
| Reportes | ReportLab (PDF) + XlsxWriter (Excel) | |
| Entorno virtual | `backend/venv/` | Activar con `source venv/Scripts/activate` |

### Cómo arrancar el proyecto
```bash
# Terminal 1 — Backend
cd dashboard-inv-svan/backend
source venv/Scripts/activate
uvicorn server:app --reload

# Terminal 2 — Frontend
cd dashboard-inv-svan/frontend
npm start
```

---

## 3. ESTRUCTURA DE CARPETAS ACTUAL

```
dashboard-inv-svan/
├── backend/
│   ├── server.py              ← Archivo principal (monolito, migrar a módulos en Fase 2)
│   ├── models/
│   │   ├── cliente.py
│   │   ├── compra.py
│   │   ├── movimiento.py
│   │   ├── producto.py
│   │   ├── proveedor.py
│   │   ├── user.py
│   │   └── venta.py
│   ├── core/
│   │   └── database.py        ← Conexión SQLAlchemy + Base
│   ├── requirements.txt
│   ├── .env                   ← NO está en git
│   └── venv/
├── frontend/src/
│   ├── components/
│   │   ├── layout/MainLayout.js
│   │   └── ui/                ← Shadcn UI (no tocar)
│   ├── features/              ← Estructura por dominios
│   │   ├── auth/pages/Login.js + services/authAPI.js
│   │   ├── productos/pages/Productos.js + services/productosAPI.js
│   │   ├── clientes/
│   │   │   ├── components/ClienteFormModal.js, ClienteSelector.js
│   │   │   ├── pages/Clientes.js
│   │   │   └── services/clientesAPI.js
│   │   ├── proveedores/pages/Proveedores.js + services/proveedoresAPI.js
│   │   ├── ventas/pages/Ventas.js + HistorialVentas.js + services/ventasAPI.js
│   │   ├── compras/pages/Compras.js + services/comprasAPI.js
│   │   ├── inventario/pages/Inventario.js + services/inventarioAPI.js
│   │   ├── dashboard/pages/Dashboard.js + services/dashboardAPI.js
│   │   └── reportes/pages/Reportes.js + services/reportesAPI.js
│   ├── context/AuthContext.js, CartContext.js
│   ├── hooks/use-toast.js
│   ├── lib/axios.js           ← Cliente HTTP base + interceptores JWT
│   ├── store/                 ← Vacío, listo para Zustand (P10)
│   └── App.js
```

---

## 4. VARIABLES DE ENTORNO (.env)

```env
SECRET_KEY=7f3a9c2d8e1b4f6a0c5d7e2b9f4a1c8d3e6b0f7a2c9d4e1b8f5a3c0d7e4b1f9
ENVIRONMENT=development
DATABASE_URL=postgresql+asyncpg://postgres:TU_PASSWORD@localhost:5432/svan_db
```

---

## 5. SCHEMA POSTGRESQL ACTUAL (9 tablas core)

```sql
-- ENUMS activos
user_role: admin, vendedor
tipo_cliente: persona, empresa
categoria_producto: 'Alimento para Animales', 'Abarrotes'
tipo_comprobante: boleta, factura
tipo_movimiento: entrada, salida
estado_compra: pendiente, recibida, cancelada

-- TABLAS
users          → id, email, nombre, role, hashed_password, is_active, created_at
productos      → id, codigo, nombre, descripcion, categoria, precio_compra, precio_venta,
                 stock, stock_minimo, unidad_medida, activo, created_at, updated_at
clientes       → id, tipo, nombre, documento, direccion, telefono, email, activo, created_at
proveedores    → id, nombre, ruc, direccion, telefono, email, activo, created_at
ventas         → id, numero_comprobante, tipo_comprobante, cliente_id, usuario_id,
                 subtotal, igv, total, estado, fecha, notas
venta_items    → id, venta_id, producto_id, cantidad, precio_unitario, subtotal
compras        → id, numero_orden, proveedor_id, usuario_id, subtotal, total,
                 estado, fecha, fecha_recepcion, notas
compra_items   → id, compra_id, producto_id, cantidad, precio_unitario, subtotal
movimientos    → id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo,
                 referencia, usuario_id, notas, fecha

-- SEQUENCES
seq_orden_compra, seq_boleta, seq_factura
```

---

## 6. TODO COMPLETADO ✅

### Sprint 1 — Seguridad (completado)
| # | Fix | Commit |
|---|-----|--------|
| P1 | SECRET_KEY obligatoria — RuntimeError si no existe | 49657a5 |
| P2 | /seed protegido por ENVIRONMENT=development | 49657a5 |
| P3 | Race condition stock — find_one_and_update atómico (MongoDB, ya migrado) | fix/stock |
| P4 | Correlativos únicos con sequences | fix/seq |
| P5 | Índices MongoDB en startup | fix/db |

### Migración MongoDB → PostgreSQL (completado)
- SQLAlchemy 2.0 async + asyncpg instalado en venv
- 9 tablas core creadas con foreign keys, índices y sequences
- server.py completamente reescrito para PostgreSQL
- Modelos ORM en `backend/models/`
- Seed funcionando: 25 productos, 20 clientes, 20 proveedores, 2 users
- Login JWT funcionando
- Todos los endpoints core funcionando

### Refactorización frontend (completado)
- Estructura por features/ con servicios separados por dominio
- store/ creada y lista para Zustand
- lib/axios.js con interceptores JWT centralizados
- Corrección de campos: proveedores usa `ruc` y `nombre`, clientes usa `nombre` y `documento`

---

## 7. COMPLETADO — SPRINT 2 ✅

### P6 — Transacciones en create_venta() y recibir_compra() ✅
- **Implementado en server.py**
- Se garantizó la integridad atómica y el rollback automático mediante el uso de `try/except` con `await db.commit()` y `await db.rollback()`, adaptándose limpiamente a la sesión implícita de FastAPI para no colisionar con SQLAlchemy.

### P7 — Paginación en endpoints GET ✅
- Requerimientos de paginación (`page: int = 1` y `limit: int = 50`) integrados a `/productos`, `/clientes`, `/proveedores`, `/ventas`, `/compras` e `/inventario/movimientos`.
- Formato de respuesta unificado a: `{"data": [...], "total": N, "page": P, "pages": total_pages}`
- **Frontend actualizado:** Todos los componentes de tabla leen correctamente `response.data.data`.

### P8 — Refresh tokens JWT ✅
- Función `create_refresh_token()` con expiración de 7 días activa y devolviéndose en POST `/auth/login`.
- Nuevo endpoint POST `/auth/refresh` creado y completamente funcional.
- Expiración de acceso reducida a 15 minutos en `ACCESS_TOKEN_EXPIRE_MINUTES`.
- **Frontend coordinado:** Interceptor inteligente activo en `lib/axios.js` que escucha el error 401, llama al `refresh_token` de fondo, actualiza y re-ejecuta la llamada de manera imperceptible para el usuario.

---

## 8. COMPLETADO — SPRINT 3 (FRONTEND) ✅

### P9 — seed() automático en App.js ✅
```javascript
// Implementado en App.js mediante useEffect

useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    seedAPI.seed().catch(() => {}); // falla silenciosamente
  }
}, []); // array vacío = solo ejecuta una vez al montar
```

### P10 — Migrar Context API a Zustand ✅
- Instalado: `zustand` configurado exitosamente.
- Creados `src/store/authStore.js` y `src/store/cartStore.js`.
- Reemplazadas todas las instancias de `useAuth` y `useCart` en toda la aplicación.
- Eliminados `AuthContext.js`, `CartContext.js` y limpiado `App.js`.
- Sistema preparado para escalabilidad con los nuevos módulos empresariales.

---

## 9. NUEVOS MÓDULOS A IMPLEMENTAR (FASE 3)

### 9.1 Cotizaciones

**Lógica de negocio:**
- Una cotización es una propuesta de venta antes de confirmarla
- Puede convertirse en venta con un click (genera la venta desde la cotización)
- Tiene fecha de vencimiento (ej: válida 15 días)
- Estados: borrador → enviada → aprobada/rechazada/vencida

**Tablas a crear:**
```sql
CREATE TYPE estado_cotizacion AS ENUM ('borrador', 'enviada', 'aprobada', 'rechazada', 'vencida');
CREATE SEQUENCE seq_cotizacion START 1;

CREATE TABLE cotizaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_cotizacion VARCHAR(20) UNIQUE NOT NULL, -- COT-00000001
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_vencimiento DATE NOT NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    usuario_id UUID NOT NULL REFERENCES users(id),
    subtotal NUMERIC(10,2) NOT NULL,
    igv NUMERIC(10,2) NOT NULL,
    total NUMERIC(10,2) NOT NULL,
    estado estado_cotizacion NOT NULL DEFAULT 'borrador',
    venta_id UUID REFERENCES ventas(id) ON DELETE SET NULL, -- si se convirtió en venta
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cotizacion_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cotizacion_id UUID NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL
);

CREATE INDEX idx_cotizaciones_cliente ON cotizaciones(cliente_id);
CREATE INDEX idx_cotizaciones_estado ON cotizaciones(estado);
CREATE INDEX idx_cotizaciones_fecha ON cotizaciones(fecha);
```

**Endpoints necesarios:**
```
POST   /api/cotizaciones                    → crear cotización
GET    /api/cotizaciones                    → listar (filtros: estado, cliente, fecha)
GET    /api/cotizaciones/{id}               → detalle
PUT    /api/cotizaciones/{id}               → editar (solo si es borrador)
POST   /api/cotizaciones/{id}/enviar        → cambiar estado a enviada
POST   /api/cotizaciones/{id}/aprobar       → cambiar estado a aprobada
POST   /api/cotizaciones/{id}/convertir-venta → crear venta desde cotización
POST   /api/cotizaciones/{id}/cancelar      → rechazar
GET    /api/cotizaciones/{id}/pdf           → generar PDF de cotización
```

**Frontend:**
- Nueva página `features/cotizaciones/pages/Cotizaciones.js`
- Nuevo servicio `features/cotizaciones/services/cotizacionesAPI.js`
- Botón "Convertir a Venta" en el detalle de cotización
- PDF similar al comprobante de venta pero con el header "COTIZACIÓN"

---

### 9.2 Notas de Crédito

**Lógica de negocio:**
- Se emite cuando una venta se anula o se devuelve mercadería
- Debe referenciar la venta original obligatoriamente
- Tipos: anulación (cancela toda la venta), devolución (devuelve algunos productos), descuento
- Al procesar una devolución, el stock de los productos devueltos debe aumentar
- Genera un movimiento de entrada en el Kardex

**Tablas a crear:**
```sql
CREATE TYPE tipo_nota_credito AS ENUM ('anulacion', 'devolucion', 'descuento');
CREATE SEQUENCE seq_nota_credito START 1;

CREATE TABLE notas_credito (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_nota VARCHAR(20) UNIQUE NOT NULL, -- NC-00000001
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    venta_id UUID NOT NULL REFERENCES ventas(id),
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    usuario_id UUID NOT NULL REFERENCES users(id),
    tipo tipo_nota_credito NOT NULL,
    motivo TEXT NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    igv NUMERIC(10,2) NOT NULL,
    total NUMERIC(10,2) NOT NULL,
    notas TEXT
);

CREATE TABLE nota_credito_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nota_credito_id UUID NOT NULL REFERENCES notas_credito(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL
);

CREATE INDEX idx_notas_credito_venta ON notas_credito(venta_id);
CREATE INDEX idx_notas_credito_fecha ON notas_credito(fecha);
CREATE INDEX idx_notas_credito_tipo ON notas_credito(tipo);
```

**Endpoints necesarios:**
```
POST   /api/notas-credito                   → crear nota de crédito
GET    /api/notas-credito                   → listar
GET    /api/notas-credito/{id}              → detalle
GET    /api/notas-credito/{id}/pdf          → PDF de la nota
```

**Lógica crítica en POST /notas-credito:**
```python
# Si tipo == 'devolucion' o 'anulacion':
# 1. Para cada item devuelto:
#    - UPDATE productos SET stock = stock + cantidad WHERE id = producto_id
#    - INSERT INTO movimientos (tipo='entrada', referencia=nota_id, ...)
# 2. Si tipo == 'anulacion':
#    - UPDATE ventas SET estado='anulada' WHERE id = venta_id
# Todo dentro de try/except con db.commit()/db.rollback() para garantizar atomicidad
```

---

### 9.3 Guías de Remisión

**Lógica de negocio:**
- Documento que acompaña el despacho físico de mercadería
- Se genera a partir de una venta aprobada
- Registra: transportista, placa del vehículo, dirección de partida y llegada
- Estados: pendiente → en_transito → entregada/anulada

**Tablas a crear:**
```sql
CREATE TYPE estado_guia AS ENUM ('pendiente', 'en_transito', 'entregada', 'anulada');
CREATE SEQUENCE seq_guia_remision START 1;

CREATE TABLE guias_remision (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_guia VARCHAR(20) UNIQUE NOT NULL, -- GR-00000001
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_traslado DATE NOT NULL,
    venta_id UUID REFERENCES ventas(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    usuario_id UUID NOT NULL REFERENCES users(id),
    direccion_partida TEXT NOT NULL,
    direccion_llegada TEXT NOT NULL,
    transportista VARCHAR(255),
    vehiculo_placa VARCHAR(20),
    estado estado_guia NOT NULL DEFAULT 'pendiente',
    notas TEXT
);

CREATE TABLE guia_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guia_id UUID NOT NULL REFERENCES guias_remision(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    unidad_medida VARCHAR(50) NOT NULL DEFAULT 'unidad'
);

CREATE INDEX idx_guias_venta ON guias_remision(venta_id);
CREATE INDEX idx_guias_estado ON guias_remision(estado);
CREATE INDEX idx_guias_fecha ON guias_remision(fecha);
```

**Endpoints necesarios:**
```
POST   /api/guias-remision                  → crear guía
GET    /api/guias-remision                  → listar
GET    /api/guias-remision/{id}             → detalle
POST   /api/guias-remision/{id}/despachar   → estado → en_transito
POST   /api/guias-remision/{id}/entregar    → estado → entregada
GET    /api/guias-remision/{id}/pdf         → PDF de la guía
```

---

### 9.4 Cuentas por Cobrar

**Lógica de negocio:**
- Se genera cuando una venta se hace al crédito (no se paga en el momento)
- Registra cuánto debe el cliente y cuándo vence el plazo
- Se puede pagar en cuotas (varios pagos parciales)
- El campo `monto_pendiente` se calcula automáticamente

**Tablas a crear:**
```sql
CREATE TYPE estado_cuenta_cobrar AS ENUM ('pendiente', 'parcial', 'pagada', 'vencida');

CREATE TABLE cuentas_por_cobrar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_vencimiento DATE NOT NULL,
    venta_id UUID NOT NULL REFERENCES ventas(id),
    cliente_id UUID NOT NULL REFERENCES clientes(id),
    monto_total NUMERIC(10,2) NOT NULL,
    monto_pagado NUMERIC(10,2) NOT NULL DEFAULT 0,
    monto_pendiente NUMERIC(10,2) GENERATED ALWAYS AS (monto_total - monto_pagado) STORED,
    estado estado_cuenta_cobrar NOT NULL DEFAULT 'pendiente',
    usuario_id UUID NOT NULL REFERENCES users(id),
    notas TEXT
);

CREATE TABLE pagos_cobro (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cuenta_id UUID NOT NULL REFERENCES cuentas_por_cobrar(id),
    monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    metodo_pago VARCHAR(50) NOT NULL DEFAULT 'efectivo', -- efectivo, transferencia, cheque
    referencia VARCHAR(255), -- número de operación/cheque
    usuario_id UUID NOT NULL REFERENCES users(id),
    notas TEXT
);

CREATE INDEX idx_cxc_cliente ON cuentas_por_cobrar(cliente_id);
CREATE INDEX idx_cxc_estado ON cuentas_por_cobrar(estado);
CREATE INDEX idx_cxc_vencimiento ON cuentas_por_cobrar(fecha_vencimiento);
```

**Endpoints necesarios:**
```
POST   /api/cuentas-cobrar                  → crear cuenta (al registrar venta a crédito)
GET    /api/cuentas-cobrar                  → listar (filtros: estado, cliente, vencidas)
GET    /api/cuentas-cobrar/{id}             → detalle con historial de pagos
POST   /api/cuentas-cobrar/{id}/pagar       → registrar pago parcial o total
GET    /api/cuentas-cobrar/stats            → total por cobrar, vencidas, próximas a vencer
```

---

### 9.5 Cuentas por Pagar

**Lógica de negocio:**
- Idéntica a cuentas por cobrar pero hacia proveedores
- Se genera al registrar una compra a crédito
- Registra cuánto debemos al proveedor y cuándo vence

**Tablas a crear:**
```sql
CREATE TYPE estado_cuenta_pagar AS ENUM ('pendiente', 'parcial', 'pagada', 'vencida');

CREATE TABLE cuentas_por_pagar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_vencimiento DATE NOT NULL,
    compra_id UUID NOT NULL REFERENCES compras(id),
    proveedor_id UUID NOT NULL REFERENCES proveedores(id),
    monto_total NUMERIC(10,2) NOT NULL,
    monto_pagado NUMERIC(10,2) NOT NULL DEFAULT 0,
    monto_pendiente NUMERIC(10,2) GENERATED ALWAYS AS (monto_total - monto_pagado) STORED,
    estado estado_cuenta_pagar NOT NULL DEFAULT 'pendiente',
    usuario_id UUID NOT NULL REFERENCES users(id),
    notas TEXT
);

CREATE TABLE pagos_proveedor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cuenta_id UUID NOT NULL REFERENCES cuentas_por_pagar(id),
    monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    metodo_pago VARCHAR(50) NOT NULL DEFAULT 'efectivo',
    referencia VARCHAR(255),
    usuario_id UUID NOT NULL REFERENCES users(id),
    notas TEXT
);

CREATE INDEX idx_cxp_proveedor ON cuentas_por_pagar(proveedor_id);
CREATE INDEX idx_cxp_estado ON cuentas_por_pagar(estado);
CREATE INDEX idx_cxp_vencimiento ON cuentas_por_pagar(fecha_vencimiento);
```

**Endpoints necesarios:**
```
POST   /api/cuentas-pagar                   → crear cuenta
GET    /api/cuentas-pagar                   → listar
GET    /api/cuentas-pagar/{id}              → detalle
POST   /api/cuentas-pagar/{id}/pagar        → registrar pago
GET    /api/cuentas-pagar/stats             → total por pagar, vencidas
```

---

## 10. ORDEN DE IMPLEMENTACIÓN RECOMENDADO

```
AHORA (Sprint 3 → Completado ✅):
1. P9 — seed() en App.js para auto-popular BD en desarrollo ✅
2. P10 — Migración total a Zustand del Auth y Cart ✅
- El frontend está listo y optimizado para módulos pesados.

SPRINT 4 (FASE 3 — Módulos Nuevos):
1. Cotizaciones     → independiente, no afecta fuertemente módulos existentes
2. Notas de crédito → depende de ventas (debe estar estable primero)
3. Guías de remisión → depende de ventas y clientes
4. Cuentas por cobrar → depende de ventas
5. Cuentas por pagar → depende de compras
```

---

## 11. PATRONES DE CÓDIGO A SEGUIR

*(Omitido por brevedad técnica general...)*

---

*Documento vivo — actualizar con cada módulo completado*
