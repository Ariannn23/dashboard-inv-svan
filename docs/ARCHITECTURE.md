# Arquitectura del Sistema - Dashboard Inversiones Svan

Este documento describe la arquitectura técnica del sistema ERP para Inversiones Svan.

## Visión General

El sistema es una aplicación web moderna diseñada para la gestión de inventario y ventas. Sigue una arquitectura cliente-servidor desacoplada (Headless), donde el frontend y el backend se comunican exclusivamente a través de una API REST.

### Diagrama de Alto Nivel

```mermaid
graph TD
    User[Usuario (Admin/Vendedor)] -->|HTTPS| Frontend[Frontend React]
    Frontend -->|API REST (JSON)| Backend[Backend FastAPI]
    Backend -->|Motor Driver| DB[(MongoDB)]
```

## Backend (Python + FastAPI)

El backend está construido sobre Python utilizando FastAPI. Debido a la naturaleza del proyecto (MVP/Simulación), se ha optado por una arquitectura simplificada pero escalable.

### Estructura de Archivos

El backend reside principalmente en un archivo monolítico `backend/server.py` que contiene:

- **Modelos Pydantic**: Definición de esquemas de datos y validación.
- **Lógica de Negocio**: Controladores par Ventas, Inventario, Compras, etc.
- **Base de Datos**: Conexión y operaciones con MongoDB (usando `motor`).
- **Autenticación**: Implementación de JWT y hashing de contraseñas.
- **Utilidades**: Generación de PDFs (ReportLab) y Excel (XlsxWriter).

### Tecnologías Clave

- **FastAPI**: Framework web de alto rendimiento.
- **MongoDB + Motor**: Base de datos NoSQL asíncrona. Ideal para estructuras de documentos flexibles como las ventas simuladas.
- **Python-Jose + Passlib**: Manejo de seguridad, tokens JWT y encriptación.
- **ReportLab**: Generación programática de PDFs para comprobantes de pago.

### Modelo de Datos (MongoDB)

Las principales colecciones son:

- `users`: Usuarios del sistema (Admin/Vendedor).
- `productos`: Catálogo de productos con control de stock.
- `clientes`: Registro de clientes (Personas/Empresas).
- `proveedores`: Registro de proveedores.
- `ventas`: Transacciones de venta (Cabecera + Items).
- `compras`: Órdenes de compra y recepción de mercadería.
- `movimientos`: Kardex detallado de entradas y salidas de stock.

## Frontend (React)

El frontend es una aplicación Single Page Application (SPA) construida con React 19.

### Tecnologías Clave

- **React 19**: Biblioteca de UI.
- **React Router v7**: Manejo de rutas y navegación.
- **Tailwind CSS**: Framework de utilidades CSS para diseño responsive.
- **Radix UI / Shadcn**: Componentes de UI accesibles y personalizables.
- **Axios**: Cliente HTTP para comunicación con el backend.
- **Recharts**: Librería de gráficos para el dashboard.

### Estructura de Componentes

El frontend sigue una estructura modular:

- **Layouts**: Estructuras base de página (Sidebar, Header).
- **Pages**: Vistas principales (Dashboard, Inventario, Ventas).
- **Components**: Componentes reutilizables (Botones, Inputs, Modales).
- **Services/Hooks**: Lógica de conexión a la API y gestión de estado.

## Decisiones de Diseño

1.  **Facturación Simulada**:
    - No hay integración real con SUNAT.
    - Los PDFs se generan en el servidor para centralizar la lógica de formato.
    - La numeración de comprobantes es correlativa simple gestionada por la base de datos.
2.  **Manejo de Stock**:
    - Las ventas descuentan stock automáticamente.
    - Se mantiene un historial (Kardex) en la colección `movimientos` para auditoría.
3.  **Seguridad**:
    - Protección de rutas mediante JWT validado en cada petición.
    - Roles `admin` y `vendedor` limitan el acceso a funciones críticas (borrar productos, ajustes de inventario).
