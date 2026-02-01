# 🚀 Cómo Iniciar el Proyecto - Dashboard Inversiones Svan

Guía paso a paso para iniciar el proyecto cada vez que quieras trabajar en él.

---

## 📋 Requisitos Previos

Antes de iniciar, asegúrate de tener:

- ✅ MongoDB instalado y funcionando
- ✅ Git Bash o terminal de tu preferencia
- ✅ Visual Studio Code (recomendado) u otro editor

---

## 🎯 Inicio Rápido (Método Recomendado)

### Paso 1: Abrir el Proyecto

```bash
# Navegar al directorio del proyecto
cd c:/Users/arian/arian/Escritorio/Programacion/Portafolio/dashboard-inv-svan
```

### Paso 2: Abrir Dos Terminales

Necesitarás **dos terminales separadas**:

- **Terminal 1**: Para el backend (Python/FastAPI)
- **Terminal 2**: Para el frontend (React)

#### En Visual Studio Code:

1. Abre el proyecto: `File > Open Folder`
2. Abre la primera terminal: `Terminal > New Terminal` (Ctrl + Shift + `)
3. Divide la terminal: Click en el ícono de "Split Terminal" o `Ctrl + Shift + 5`

#### En Git Bash:

1. Abre una ventana de Git Bash
2. Abre otra ventana de Git Bash

### Paso 3: Iniciar el Backend

**En la Terminal 1:**

```bash
# Navegar a la carpeta del backend
cd backend

# Ejecutar el script de inicio
./start-backend.sh
```

**Salida esperada:**

```
========================================
  Iniciando Backend - Dashboard Svan
========================================

[1/3] Activando entorno virtual...
[2/3] Verificando MongoDB...
MongoDB encontrado: /c/Program Files/MongoDB/Server/8.2/bin/mongod.exe
[3/3] Iniciando servidor FastAPI...

Backend disponible en: http://localhost:8000
Documentación API en: http://localhost:8000/docs

INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

✅ **Backend listo** cuando veas: `Application startup complete`

### Paso 4: Iniciar el Frontend

**En la Terminal 2:**

```bash
# Navegar a la carpeta del frontend
cd frontend

# Ejecutar el script de inicio
npm start
```

**Salida esperada:**

```
========================================
  Iniciando Frontend - Dashboard Svan
========================================

[1/1] Iniciando servidor React...

Compiled successfully!

You can now view frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://172.21.224.1:3000
```

✅ **Frontend listo** cuando veas: `Compiled successfully!`

El navegador se abrirá automáticamente en http://localhost:3000

### Paso 5: Iniciar Sesión

1. El navegador abrirá http://localhost:3000
2. Verás la pantalla de login
3. Ingresa las credenciales:
   - **Email**: `admin@svan.com`
   - **Password**: `admin123`
4. Click en "Iniciar Sesión"

✅ **¡Listo para trabajar!**

---

## 🌱 ¿Necesito Cargar Datos de Prueba?

### ❌ NO - Si ya iniciaste el proyecto antes

Los datos ya están en MongoDB y **persisten entre reinicios**. No necesitas volver a ejecutar el comando seed.

### ✅ SÍ - Solo en estos casos:

1. **Primera vez que configuras el proyecto**

   ```bash
   curl -X POST http://localhost:8000/api/seed
   ```

2. **Si borraste la base de datos**

   ```bash
   # Si ejecutaste: mongosh svan_db --eval "db.dropDatabase()"
   curl -X POST http://localhost:8000/api/seed
   ```

3. **Si quieres resetear los datos a su estado inicial**

   ```bash
   # Primero borrar la base de datos
   mongosh svan_db --eval "db.dropDatabase()"

   # Luego recargar datos
   curl -X POST http://localhost:8000/api/seed
   ```

### 📊 Verificar si ya tienes datos

```bash
# Conectar a MongoDB
mongosh mongodb://localhost:27017/svan_db

# Ver usuarios
db.users.find().pretty()

# Si ves usuarios (admin@svan.com, vendedor@svan.com), ya tienes datos ✅
# Si no ves nada, necesitas ejecutar el seed ❌
```

### 💡 Resumen

**Inicio normal del proyecto (cada día):**

1. `cd backend && ./start-backend.sh`
2. `cd frontend && npm start`
3. Login en http://localhost:3000

**NO necesitas** ejecutar `curl -X POST http://localhost:8000/api/seed` cada vez.

---

## 🔄 Método Alternativo (Comandos Manuales)

Si prefieres no usar los scripts de inicio:

### Backend (Terminal 1)

```bash
# Navegar al backend
cd c:/Users/arian/arian/Escritorio/Programacion/Portafolio/dashboard-inv-svan/backend

# Activar entorno virtual
source venv/Scripts/activate

# Iniciar servidor
uvicorn server:app --reload
```

### Frontend (Terminal 2)

```bash
# Navegar al frontend
cd c:/Users/arian/arian/Escritorio/Programacion/Portafolio/dashboard-inv-svan/frontend

# Iniciar servidor
npm start
```

---

## 🌐 URLs del Proyecto

Una vez iniciado, tendrás acceso a:

| Servicio               | URL                         | Descripción               |
| ---------------------- | --------------------------- | ------------------------- |
| **Frontend**           | http://localhost:3000       | Aplicación web principal  |
| **Backend API**        | http://localhost:8000       | API REST                  |
| **API Docs (Swagger)** | http://localhost:8000/docs  | Documentación interactiva |
| **API Docs (ReDoc)**   | http://localhost:8000/redoc | Documentación alternativa |

---

## 👥 Usuarios de Prueba

El sistema viene con dos usuarios precargados:

### Administrador

- **Email**: `admin@svan.com`
- **Password**: `admin123`
- **Permisos**: Acceso completo al sistema

### Vendedor

- **Email**: `vendedor@svan.com`
- **Password**: `vendedor123`
- **Permisos**: Ventas, clientes, consulta de inventario

---

## 🛑 Cómo Detener el Proyecto

### Detener Backend

En la terminal del backend, presiona:

```
Ctrl + C
```

### Detener Frontend

En la terminal del frontend, presiona:

```
Ctrl + C
```

### Cerrar Todo

1. Detén el frontend: `Ctrl + C`
2. Detén el backend: `Ctrl + C`
3. Cierra las terminales

---

## 🔍 Verificar que Todo Funciona

### 1. Verificar Backend

Abre http://localhost:8000/docs en tu navegador.

Deberías ver la documentación Swagger con todos los endpoints:

- `/api/auth/login`
- `/api/productos`
- `/api/ventas`
- etc.

### 2. Verificar Frontend

Abre http://localhost:3000 en tu navegador.

Deberías ver la pantalla de login del sistema.

### 3. Verificar MongoDB

En una terminal:

```bash
mongosh mongodb://localhost:27017/svan_db
```

Dentro de mongosh:

```javascript
// Ver colecciones
show collections

// Ver usuarios
db.users.find().pretty()

// Salir
exit
```

---

## 🐛 Solución de Problemas Comunes

### Problema 1: "MongoDB no encontrado"

**Síntoma**: El script dice que MongoDB no está instalado

**Solución**:

```bash
# Verificar que MongoDB esté instalado
"C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --version

# Si no está instalado, descargarlo de:
# https://www.mongodb.com/try/download/community
```

### Problema 2: "Puerto 8000 ya está en uso"

**Síntoma**: Error al iniciar el backend

**Solución**:

```bash
# Opción 1: Detener el proceso que usa el puerto
# En Windows, buscar el proceso:
netstat -ano | findstr :8000

# Opción 2: Usar otro puerto
cd backend
source venv/Scripts/activate
uvicorn server:app --reload --port 8001

# Actualizar la URL del API en el frontend si es necesario
```

### Problema 3: "Puerto 3000 ya está en uso"

**Síntoma**: Error al iniciar el frontend

**Solución**:
El sistema te preguntará automáticamente:

```
? Something is already running on port 3000.
Would you like to run the app on another port instead? (Y/n)
```

Responde `Y` para usar el puerto 3001.

### Problema 4: "Cannot find module"

**Síntoma**: Error al iniciar el frontend

**Solución**:

```bash
cd frontend

# Limpiar node_modules
rm -rf node_modules package-lock.json

# Reinstalar dependencias
npm install --force

# Intentar de nuevo
npm start
```

### Problema 5: "Error de conexión al backend"

**Síntoma**: El frontend no puede conectarse al backend

**Solución**:

1. Verifica que el backend esté corriendo en http://localhost:8000
2. Verifica que `CORS_ORIGINS` en `backend/.env` incluya `http://localhost:3000`
3. Reinicia ambos servidores

### Problema 6: "Entorno virtual no se activa"

**Síntoma**: Error al activar el entorno virtual

**Solución**:

```bash
# Recrear el entorno virtual
cd backend
rm -rf venv
py -m venv venv
source venv/Scripts/activate
pip install -r requirements.txt
```

---

## 📝 Checklist de Inicio

Usa esta lista cada vez que inicies el proyecto:

- [ ] Abrir el proyecto en VS Code o tu editor
- [ ] Abrir Terminal 1 para backend
- [ ] Abrir Terminal 2 para frontend
- [ ] En Terminal 1: `cd backend && ./start-backend.sh`
- [ ] Esperar a ver "Application startup complete"
- [ ] En Terminal 2: `cd frontend && npm start`
- [ ] Esperar a ver "Compiled successfully!"
- [ ] Abrir http://localhost:3000 en el navegador
- [ ] Login con `admin@svan.com` / `admin123`
- [ ] ✅ ¡Listo para trabajar!

---

## 💡 Tips y Mejores Prácticas

### 1. Mantén las Terminales Abiertas

No cierres las terminales mientras trabajas. Los servidores se recargan automáticamente cuando haces cambios.

### 2. Usa Git Bash

Git Bash es más compatible con los scripts `.sh` que CMD o PowerShell.

### 3. Verifica los Logs

Si algo no funciona:

- **Backend**: Revisa la Terminal 1 para ver errores
- **Frontend**: Revisa la Terminal 2 y la consola del navegador (F12)

### 4. Hot Reload

Los cambios se recargan automáticamente:

- **Backend**: Cambios en `.py` se recargan con `--reload`
- **Frontend**: Cambios en `.js/.jsx` se recargan automáticamente

### 5. Guarda Frecuentemente

Usa `Ctrl + S` para guardar. Los cambios se aplicarán automáticamente.

---

## 🎨 Flujo de Trabajo Típico

### Inicio del Día

```bash
# 1. Abrir el proyecto
cd c:/Users/arian/arian/Escritorio/Programacion/Portafolio/dashboard-inv-svan

# 2. Iniciar backend (Terminal 1)
cd backend && ./start-backend.sh

# 3. Iniciar frontend (Terminal 2)
cd frontend && npm start

# 4. Abrir navegador
# http://localhost:3000
```

### Durante el Desarrollo

1. Edita archivos en tu editor
2. Guarda los cambios (`Ctrl + S`)
3. Los cambios se recargan automáticamente
4. Prueba en el navegador
5. Revisa logs si hay errores

### Fin del Día

```bash
# 1. Detener frontend (Terminal 2)
Ctrl + C

# 2. Detener backend (Terminal 1)
Ctrl + C

# 3. Commit de cambios (opcional)
git add .
git commit -m "Descripción de cambios"
git push
```

---

## 📚 Recursos Adicionales

### Documentación del Proyecto

- [README.md](file:///c:/Users/arian/arian/Escritorio/Programacion/Portafolio/dashboard-inv-svan/README.md) - Información general
- [PROYECTO_LISTO.md](file:///C:/Users/arian/.gemini/antigravity/brain/d5c089b4-5c77-4d1d-ab53-5b580da3150e/PROYECTO_LISTO.md) - Estado de configuración
- [COMANDOS_DESARROLLO.md](file:///C:/Users/arian/.gemini/antigravity/brain/d5c089b4-5c77-4d1d-ab53-5b580da3150e/COMANDOS_DESARROLLO.md) - Referencia de comandos

### Documentación Técnica

- [FastAPI Docs](https://fastapi.tiangolo.com/) - Framework del backend
- [React Docs](https://react.dev/) - Framework del frontend
- [MongoDB Docs](https://www.mongodb.com/docs/) - Base de datos

---

## 🎯 Resumen Rápido

**Inicio en 3 pasos:**

1. **Terminal 1**: `cd backend && ./start-backend.sh`
2. **Terminal 2**: `cd frontend && npm start`
3. **Navegador**: http://localhost:3000 → Login con `admin@svan.com`

**Detener:**

- `Ctrl + C` en ambas terminales

**URLs importantes:**

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

**¡Listo para desarrollar! 🚀**

Si tienes problemas, revisa la sección de "Solución de Problemas" o consulta la documentación adicional.
