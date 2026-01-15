@echo off
setlocal enabledelayedexpansion

echo ========================================
echo VSCode EasyPlatform Hooks - Auto Deploy
echo ========================================
echo.

:: Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: package.json not found!
    echo Please run this script from the vscode-easyplatform-hooks directory.
    pause
    exit /b 1
)

:: Step 1: Install dependencies
echo [1/5] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)
echo ✓ Dependencies installed
echo.

:: Step 2: Compile TypeScript
echo [2/5] Compiling TypeScript...
call npm run compile
if errorlevel 1 (
    echo ERROR: Compilation failed!
    pause
    exit /b 1
)
echo ✓ TypeScript compiled successfully
echo.

:: Step 3: Run tests (optional, comment out to skip)
echo [3/5] Running tests...
call npm test
if errorlevel 1 (
    echo WARNING: Some tests failed, but continuing...
    echo.
) else (
    echo ✓ All tests passed
    echo.
)

:: Step 4: Package extension
echo [4/5] Packaging extension...
call npm run package
if errorlevel 1 (
    echo ERROR: Packaging failed!
    pause
    exit /b 1
)
echo ✓ Extension packaged
echo.

:: Find the .vsix file
for %%f in (*.vsix) do set VSIX_FILE=%%f

if not defined VSIX_FILE (
    echo ERROR: No .vsix file found!
    echo Packaging may have failed.
    pause
    exit /b 1
)

:: Step 5: Install to VSCode
echo [5/5] Installing extension to VSCode...
echo Installing: %VSIX_FILE%
code --install-extension "%VSIX_FILE%" --force
if errorlevel 1 (
    echo ERROR: Installation failed!
    echo Make sure VSCode is installed and 'code' command is in PATH.
    pause
    exit /b 1
)
echo ✓ Extension installed successfully
echo.

:: Success summary
echo ========================================
echo ✓ DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Extension: %VSIX_FILE%
echo Status: Installed to VSCode
echo.
echo Next steps:
echo 1. Restart VSCode if it's currently running
echo 2. Open VSCode Command Palette (Ctrl+Shift+P)
echo 3. Verify activation: Check "EasyPlatform Hooks" in Output panel
echo.
echo For configuration, search "easyplatformHooks" in VSCode Settings
echo.
pause
