#!/bin/bash

echo "========================================"
echo "  Iniciando Backend - Dashboard Svan"
echo "========================================"
echo ""

cd "$(dirname "$0")"

echo "[1/3] Activando entorno virtual..."
source venv/Scripts/activate

echo "[2/3] Verificando MongoDB..."

# Intentar encontrar MongoDB en ubicaciones comunes
MONGOD_PATH=""
if [ -f "/c/Program Files/MongoDB/Server/8.2/bin/mongod.exe" ]; then
    MONGOD_PATH="/c/Program Files/MongoDB/Server/8.2/bin/mongod.exe"
elif [ -f "/c/Program Files/MongoDB/Server/8.0/bin/mongod.exe" ]; then
    MONGOD_PATH="/c/Program Files/MongoDB/Server/8.0/bin/mongod.exe"
elif [ -f "/c/Program Files/MongoDB/Server/7.0/bin/mongod.exe" ]; then
    MONGOD_PATH="/c/Program Files/MongoDB/Server/7.0/bin/mongod.exe"
elif command -v mongod &> /dev/null; then
    MONGOD_PATH="mongod"
fi

if [ -z "$MONGOD_PATH" ]; then
    echo ""
    echo "[ERROR] MongoDB no está instalado o no se encuentra"
    echo "Por favor, instala MongoDB desde: https://www.mongodb.com/try/download/community"
    echo ""
    exit 1
fi

echo "MongoDB encontrado: $MONGOD_PATH"

echo "[3/3] Iniciando servidor FastAPI..."
echo ""
echo "Backend disponible en: http://localhost:8000"
echo "Documentación API en: http://localhost:8000/docs"
echo ""
echo "Presiona Ctrl+C para detener el servidor"
echo ""

uvicorn server:app --reload
