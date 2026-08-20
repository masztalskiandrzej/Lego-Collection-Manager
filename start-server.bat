@echo off
title LEGO Collection Manager - start
echo ==========================================
echo   LEGO Collection Manager - serwery lokalne
echo ==========================================
echo.
cd /d "%~dp0"

echo [1/3] Sprawdzam Node.js...
where node >nul 2>nul
if errorlevel 1 (
    echo BLAD: Node.js nie jest zainstalowany lub brak go w PATH.
    echo Zainstaluj Node.js ze strony https://nodejs.org i sprobuj ponownie.
    pause
    exit /b 1
)

echo [2/3] Uruchamiam lokalny serwer funkcji (port 5001) w osobnym oknie...
start "LEGO - funkcje (5001)" cmd /k node tools\local-functions-server.js

echo [3/3] Uruchamiam serwer aplikacji (port 8765) w osobnym oknie...
start "LEGO - aplikacja (8765)" cmd /k npx -y http-server . -p 8765 -c-1 --cors

timeout /t 3 /nobreak >nul
echo.
echo ==========================================
echo   Gotowe! Aplikacja: http://localhost:8765
echo.
echo   Otworza sie dwa dodatkowe okna:
echo    - aplikacja  (8765) - zamkniecie okna zatrzymuje serwer
echo    - funkcje    (5001) - Auto-Fill, figurki z zestawu, motywy
echo ==========================================
echo.
start http://localhost:8765
echo Ten konsol mozna zamknac - serwery dzialaja we wlasnych oknach.
timeout /t 10 >nul
