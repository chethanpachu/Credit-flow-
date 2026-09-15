@echo off
REM =========================================================================
REM GRB Collection Tracker - Windows Executable Build Script
REM Uses PyInstaller to bundle Python + Tkinter + openpyxl into a standalone .EXE
REM =========================================================================

echo.
echo =======================================================
echo  Building GRB Collection Tracker (.EXE) for Windows
echo =======================================================
echo.

REM 1. Verify Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not found in system PATH.
    echo Please install Python 3.9+ from https://www.python.org/
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

REM 2. Install dependencies from requirements.txt
echo [1/3] Installing dependencies (openpyxl, pyinstaller)...
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install requirements.
    pause
    exit /b 1
)

REM 3. Clean old build outputs if any
echo [2/3] Cleaning previous build artifacts...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist *.spec del /q *.spec

REM 4. Run PyInstaller
echo [3/3] Compiling standalone Windows .exe with PyInstaller...
pyinstaller --noconfirm --onefile --windowed ^
    --name "GRB_Collection_Tracker" ^
    --add-data "excel_manager.py;." ^
    main.py

if errorlevel 1 (
    echo.
    echo [ERROR] PyInstaller build failed. Check the error log above.
    pause
    exit /b 1
)

echo.
echo =======================================================
echo  SUCCESS! Build complete.
echo  Standalone Executable location:
echo  dist\GRB_Collection_Tracker.exe
echo =======================================================
echo.
echo You can now copy "dist\GRB_Collection_Tracker.exe" anywhere
echo (e.g. Desktop, USB drive) and run it without installing Python!
echo.
pause
