#  Dashboard Inversiones Svan

Sistema de gestión de inventario y ventas (ERP) para Inversiones Svan.

## Inicio Rápido

### Requisitos Previos

-  Python 3.14.2 (instalado)
-  Node.js 22.19.0 (instalado)
-  MongoDB (requiere instalación)

### Configuración Inicial

```bash
# Backend
cd backend
py -m venv venv
./venv/Scripts/activate
pip install -r requirements.txt

# Frontend
cd frontend
npm install --legacy-peer-deps
```

### Instalar MongoDB

**Opción 1: MongoDB Local**

- Descargar: https://www.mongodb.com/try/download/community
- Instalar y ejecutar `mongod`

**Opción 2: MongoDB Atlas (Cloud)**

- Crear cuenta en https://www.mongodb.com/cloud/atlas
- Actualizar `MONGO_URL` en `backend/.env`

### Ejecutar el Proyecto

**Opción A: Scripts de Inicio Rápido (Recomendado)**

```bash
# Terminal 1: Backend
cd backend
./start-backend.bat    # Windows CMD
# o
./start-backend.sh     # Git Bash

# Terminal 2: Frontend
cd frontend
./start-frontend.bat   # Windows CMD
# o
./start-frontend.sh    # Git Bash
```

**Opción B: Comandos Manuales**

```bash
# Terminal 1: Backend
cd backend
./venv/Scripts/activate
uvicorn server:app --reload

# Terminal 2: Frontend
cd frontend
npm start
```

### Cargar Datos de Prueba

```bash
curl -X POST http://localhost:8000/api/seed
```

O visita: http://localhost:8000/api/seed

**Usuarios de prueba:**

- Admin: `admin@svan.com` / `admin123`
- Vendedor: `vendedor@svan.com` / `vendedor123`

## Documentación

- [**Guía de Configuración Completa**](docs/GETTING_STARTED.md) - Instrucciones detalladas paso a paso
- [**Manual de Usuario**](docs/USER_GUIDE.md) - Cómo usar el sistema
- [**Arquitectura**](docs/ARCHITECTURE.md) - Descripción técnica del proyecto

## Stack Tecnológico

### Backend

- **Python 3.14+** con FastAPI
- **MongoDB** (Motor) para base de datos
- **JWT** para autenticación
- **Pydantic** para validación de datos

### Frontend

- **React 19** con Create React App
- **Tailwind CSS** para estilos
- **Shadcn UI** para componentes
- **Axios** para peticiones HTTP
- **React Router** para navegación

## URLs del Proyecto

Una vez iniciado:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Documentación API**: http://localhost:8000/docs

## Estructura del Proyecto

```
dashboard-inv-svan/
├── backend/
│   ├── venv/              # Entorno virtual Python
│   ├── server.py          # Servidor FastAPI principal
│   ├── requirements.txt   # Dependencias Python
│   ├── .env              # Variables de entorno
│   ├── start-backend.bat # Script de inicio (Windows)
│   └── start-backend.sh  # Script de inicio (Bash)
├── frontend/
│   ├── src/              # Código fuente React
│   ├── public/           # Archivos públicos
│   ├── package.json      # Dependencias Node.js
│   ├── start-frontend.bat # Script de inicio (Windows)
│   └── start-frontend.sh  # Script de inicio (Bash)
├── docs/                 # Documentación
└── README.md            # Este archivo
```

## Comandos Útiles

### Backend

```bash
# Activar entorno virtual
./venv/Scripts/activate

# Instalar nueva dependencia
pip install nombre-paquete
pip freeze > requirements.txt

# Ejecutar tests
pytest

# Formatear código
black .
```

### Frontend

```bash
# Instalar nueva dependencia
npm install nombre-paquete --legacy-peer-deps

# Build de producción
npm run build

# Ejecutar tests
npm test
```

## Solución de Problemas

### MongoDB no conecta

```bash
# Verificar que MongoDB esté corriendo
mongod --version

# Iniciar MongoDB manualmente
mongod
```

### Puerto ocupado

```bash
# Backend en otro puerto
uvicorn server:app --reload --port 8001

# Frontend usará automáticamente 3001 si 3000 está ocupado
```

### Errores de dependencias

```bash
# Backend
pip install -r requirements.txt --upgrade

# Frontend
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

## Características Principales

-  **Gestión de Inventario** - Control de productos y stock
-  **Punto de Venta** - Registro de ventas con boletas/facturas
-  **Gestión de Clientes** - Base de datos de clientes
-  **Gestión de Proveedores** - Control de proveedores
-  **Órdenes de Compra** - Gestión de compras a proveedores
-  **Kardex** - Historial de movimientos de inventario
-  **Reportes** - Análisis de ventas y estadísticas
-  **Autenticación** - Sistema de usuarios con roles (Admin/Vendedor)
-  **Dashboard** - Visualización de métricas clave

## Roles de Usuario

### Administrador

- Acceso completo al sistema
- Gestión de usuarios
- Gestión de productos, proveedores
- Órdenes de compra
- Reportes completos

### Vendedor

- Registro de ventas
- Consulta de inventario
- Gestión de clientes
- Reportes básicos

## Seguridad

- Autenticación JWT
- Contraseñas hasheadas con bcrypt
- Validación de datos con Pydantic
- CORS configurado
- Variables de entorno para secretos

## Licencia

Este proyecto es privado y pertenece a Inversiones Svan.

---

**¿Necesitas ayuda?** Revisa la [documentación completa](docs/GETTING_STARTED.md) o contacta al equipo de desarrollo.
