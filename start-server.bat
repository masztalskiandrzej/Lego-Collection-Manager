@echo off
echo ========================================
echo   LEGO Collection Manager - HTTP Server
echo ========================================
echo.
echo Starting HTTP server on port 8080...
echo.
echo Open your browser at: http://localhost:8080
echo.
echo Press Ctrl+C to stop the server
echo.
cd /d "%~dp0"
py -m http.server 8080
if errorlevel 1 (
    echo.
    echo Trying with python command...
    python -m http.server 8080
)
pause
