#!/bin/bash

echo "========================================"
echo "  Iniciando Frontend - Dashboard Svan"
echo "========================================"
echo ""

cd "$(dirname "$0")"

echo "[1/1] Iniciando servidor React..."
echo ""
echo "Frontend disponible en: http://localhost:3000"
echo ""
echo "Presiona Ctrl+C para detener el servidor"
echo ""

npm start
