# Guía de Inicio - Dashboard Inversiones Svan

Este documento detalla los pasos para configurar y ejecutar el proyecto localmente. El sistema consta de un backend en Python (FastAPI) y un frontend en React.

## Requisitos Previos

Asegúrate de tener instalado el siguiente software:

1.  **Python 3.8 o superior**: [Descargar Python](https://www.python.org/downloads/)
2.  **Node.js 16 o superior**: [Descargar Node.js](https://nodejs.org/)
3.  **MongoDB**: Necesitas una instancia de MongoDB corriendo localmente o una URL de conexión de MongoDB Atlas.
    - [Descargar MongoDB Community Server](https://www.mongodb.com/try/download/community)

## Configuración del Backend

1.  **Navegar a la carpeta del backend**:

    ```bash
    cd backend
    ```

2.  **Crear un entorno virtual (recomendado)**:

    ```bash
    python -m venv venv
    ```

3.  **Activar el entorno virtual**:
    - **Windows**:
      ```bash
      venv\Scripts\activate
      ```
    - **macOS/Linux**:
      ```bash
      source venv/bin/activate
      ```

4.  **Instalar dependencias**:

    ```bash
    pip install -r requirements.txt
    ```

5.  **Configurar variables de entorno**:
    Crea un archivo `.env` en la carpeta `backend` basado en el ejemplo (o crea uno nuevo) con el siguiente contenido:

    ```env
    MONGO_URL=mongodb://localhost:27017
    DB_NAME=svan_db
    SECRET_KEY=tu_clave_secreta_segura
    CORS_ORIGINS=http://localhost:3000
    ```

6.  **Iniciar el servidor**:

    ```bash
    uvicorn server:app --reload
    ```

    El servidor arrancará en `http://localhost:8000`.
    La documentación automática de la API estará disponible en `http://localhost:8000/docs`.

7.  **Cargar datos de prueba (Seed)**:
    Una vez que el servidor esté corriendo, puedes cargar usuarios y productos de prueba ejecutando el siguiente comando (puedes usar Postman o cURL):
    ```bash
    curl -X POST http://localhost:8000/api/seed
    ```
    Esto creará los usuarios por defecto:
    - **Admin**: `admin@svan.com` / `admin123`
    - **Vendedor**: `vendedor@svan.com` / `vendedor123`

## Configuración del Frontend

1.  **Navegar a la carpeta del frontend** (abrir una nueva terminal):

    ```bash
    cd frontend
    ```

2.  **Instalar dependencias**:

    ```bash
    npm install
    ```

3.  **Iniciar el servidor de desarrollo**:
    ```bash
    npm start
    ```
    La aplicación se abrirá automáticamente en `http://localhost:3000`.

## Uso del Sistema

1.  Abre `http://localhost:3000` en tu navegador.
2.  Inicia sesión con las credenciales de prueba (ej. `admin@svan.com`).
3.  Explora el Dashboard, Inventario, Ventas y Reportes.

## Solución de Problemas Comunes

- **Error de conexión a MongoDB**: Verifica que tu servidor de MongoDB esté corriendo y que la `MONGO_URL` en el archivo `.env` sea correcta.
- **Puerto ocupado**: Si el puerto 8000 o 3000 está ocupado, asegúrate de liberar los puertos o cambiar la configuración.
