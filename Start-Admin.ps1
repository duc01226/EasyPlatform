#Requires -Version 5.1

# Auto-elevate to Administrator if not already running as admin
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Restarting with Administrator privileges..." -ForegroundColor Yellow
    $arguments = "-NoExit -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    Start-Process PowerShell -Verb RunAs -ArgumentList $arguments
    exit
}

# Set working directory to script location
Set-Location -Path $PSScriptRoot

Write-Host "Running as Administrator in: $PSScriptRoot" -ForegroundColor Green
Write-Host ""

# ============================================
# Add your commands below this line
# ============================================

# Example: Start Docker containers
# docker-compose -f src/platform-example-app.docker-compose.yml up -d

# Example: Build solution
# dotnet build EasyPlatform.sln

# Example: Start API
# dotnet run --project src/PlatformExampleApp/PlatformExampleApp.TextSnippet.Api

Write-Host ""
Write-Host "Script completed. Terminal remains open." -ForegroundColor Cyan
