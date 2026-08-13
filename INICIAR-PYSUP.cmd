@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\expo\package.json" (
  echo Instalando dependencias de PYSUP...
  call npm.cmd install
  if errorlevel 1 goto :error
)

echo.
echo PYSUP se abrira en http://localhost:8081
start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 4; Start-Process 'http://localhost:8081'"
call npm.cmd run web -- --port 8081
exit /b %errorlevel%

:error
echo.
echo No fue posible instalar las dependencias.
pause
exit /b 1
