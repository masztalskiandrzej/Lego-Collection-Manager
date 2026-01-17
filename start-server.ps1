# LEGO Collection Manager - HTTP Server
Write-Host "========================================"
Write-Host "  LEGO Collection Manager - HTTP Server"
Write-Host "========================================"
Write-Host ""
Write-Host "Starting HTTP server on port 8080..."
Write-Host ""
Write-Host "Open your browser at: http://localhost:8080"
Write-Host ""
Write-Host "Press Ctrl+C to stop the server"
Write-Host ""

Set-Location $PSScriptRoot
& python -m http.server 8080
