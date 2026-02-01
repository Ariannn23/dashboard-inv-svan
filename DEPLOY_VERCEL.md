# Guía de Despliegue en Vercel (Frontend)

Esta guía te ayudará a desplegar el Frontend (React) en Vercel y te dará recomendaciones para el Backend.

## 1. Preparación del Proyecto

El proyecto está dividido en dos carpetas principales:

- `frontend/` (React)
- `backend/` (FastAPI/Python)

Vercel es ideal para el **Frontend**. Para el **Backend**, Vercel soporta Python pero tiene limitaciones con bases de datos persistentes y tiempos de ejecución largos. Recomendamos usar **Render** o **Railway** para el Backend.

### Configuración para Vercel (Frontend)

Para que Vercel sepa que debe desplegar solo la carpeta `frontend`, no necesitas hacer nada especial si configuras el "Root Directory" correctamente en el paso 3.

---

## 2. Despliegue del Frontend en Vercel

1.  **Crea una cuenta en [Vercel](https://vercel.com/)** si no tienes una.
2.  **Importa el proyecto**:
    - En el dashboard de Vercel, haz clic en **"Add New..."** -> **"Project"**.
    - Selecciona tu repositorio de GitHub: `dashboard-inv-svan`.
3.  **Configura el proyecto**:
    - **Framework Preset**: Vercel debería detectar "Create React App" automáticamente.
    - **Root Directory**: Haz clic en "Edit" y selecciona la carpeta `frontend`. **IMPORTANTE**.
4.  **Variables de Entorno**:
    - Despliega la sección **"Environment Variables"**.
    - Necesitas definir la URL de tu Backend. Como aún no has desplegado el backend, puedes poner una temporal o volver aquí luego.
    - Nombre: `REACT_APP_API_URL`
    - Valor: `https://tu-backend-en-render.onrender.com/api` (Cuando tengas el backend).
5.  **Deploy**:
    - Haz clic en **"Deploy"**.

Vercel construirá tu frontend y te dará una URL (ej. `https://dashboard-inv-svan.vercel.app`).

---

## 3. Despliegue del Backend (Recomendado: Render)

Para que el frontend funcione, necesitas el backend corriendo en la nube.

1.  Crea una cuenta en [Render](https://render.com/).
2.  Haz clic en **"New +"** -> **"Web Service"**.
3.  Conecta tu repositorio de GitHub.
4.  **Configuración**:
    - **Root Directory**: `backend`
    - **Runtime**: Python 3
    - **Build Command**: `pip install -r requirements.txt`
    - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 10000`
5.  **Variables de Entorno** (Environment Variables):
    - `MONGODB_URL`: Tu cadena de conexión a MongoDB Atlas.
    - `SECRET_KEY`: Una clave secreta segura para JWT.
    - `ACCESS_TOKEN_EXPIRE_MINUTES`: `1440` (ejemplo).
6.  **Deploy Web Service**.

Una vez desplegado, copia la URL que te da Render (ej. `https://mi-backend.onrender.com`) y actualiza la variable `REACT_APP_API_URL` en tu proyecto de Vercel (Paso 2.4). ¡Recuerda añadir `/api` al final si tu código frontend lo espera así! (En este proyecto, `lib/api.js` suele añadir los endpoints, pero revisa si `baseURL` ya incluye `/api` o no. En `src/lib/api.js` está configurado como `process.env.REACT_APP_API_URL || 'http://localhost:8000/api'`. Así que tu variable en Vercel debe terminar en `/api`).

---

## 4. Configuración Final

1.  Vuelve a **Vercel** -> Settings -> Environment Variables.
2.  Edita `REACT_APP_API_URL` con la URL real de tu backend + `/api`.
    - Ejemplo: `https://dashboard-inv-svan-backend.onrender.com/api`
3.  Ve a la pestaña **Deployments** en Vercel y haz clic en "Redeploy" (o haz un nuevo push a git) para que el frontend tome la nueva variable.

¡Listo! Tu aplicación debería estar funcionando en línea.
