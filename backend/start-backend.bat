@echo off
echo ========================================
echo   Iniciando Backend - Dashboard Svan
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Activando entorno virtual...
call venv\Scripts\activate.bat

echo [2/3] Verificando MongoDB...

REM Intentar encontrar MongoDB en ubicaciones comunes
set MONGOD_PATH=
if exist "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" (
    set MONGOD_PATH=C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe
) else if exist "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" (
    set MONGOD_PATH=C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe
) else if exist "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" (
    set MONGOD_PATH=C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe
) else (
    REM Intentar usar mongod del PATH
    mongod --version >nul 2>&1
    if %errorlevel% equ 0 (
        set MONGOD_PATH=mongod
    )
)

if "%MONGOD_PATH%"=="" (
    echo.
    echo [ERROR] MongoDB no esta instalado o no se encuentra
    echo Por favor, instala MongoDB desde: https://www.mongodb.com/try/download/community
    echo.
    pause
    exit /b 1
)

echo MongoDB encontrado: %MONGOD_PATH%

echo [3/3] Iniciando servidor FastAPI...
echo.
echo Backend disponible en: http://localhost:8000
echo Documentacion API en: http://localhost:8000/docs
echo.
echo Presiona Ctrl+C para detener el servidor
echo.

uvicorn server:app --reload
