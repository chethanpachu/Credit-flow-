import JSZip from 'jszip';

export const pythonSourceFiles = {
  'requirements.txt': `openpyxl>=3.1.2
pyinstaller>=6.5.0
`,
  'build_exe.bat': `@echo off
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
echo  dist\\GRB_Collection_Tracker.exe
echo =======================================================
echo.
echo You can now copy "dist\\GRB_Collection_Tracker.exe" anywhere
echo (e.g. Desktop, USB drive) and run it without installing Python!
echo.
pause
`,
  'installer.iss': `; Inno Setup Script for GRB Collection Tracker
; Creates a standard Windows installer wizard (.exe) with desktop shortcut & uninstaller

#define MyAppName "GRB Collection Tracker"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "GRB Distributorship Systems"
#define MyAppExeName "GRB_Collection_Tracker.exe"

[Setup]
AppId={{D98356E2-8BC4-4C21-B831-C5A8708C3411}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\\GRB_Collection_Tracker
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=dist_installer
OutputBaseFilename=GRB_Collection_Tracker_Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "dist\\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\\{#MyAppName}"; Filename: "{app}\\{#MyAppExeName}"
Name: "{group}\\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\\{#MyAppName}"; Filename: "{app}\\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
`,
  'README.md': `# GRB Collection Tracker (Windows Desktop App)

A lightweight, fully offline Windows desktop application built with **Python + Tkinter** and **Excel storage (\`openpyxl\`)** for a GRB items distributorship with 4 salesmen.

## Quick Start (Run from Source)
1. Install Python 3.9+ from python.org (check "Add Python to PATH").
2. Open terminal in this directory:
   \`\`\`bash
   pip install -r requirements.txt
   python main.py
   \`\`\`

## Compile Standalone Windows .EXE (PyInstaller)
Double-click \`build_exe.bat\` or execute:
\`\`\`cmd
pyinstaller --noconfirm --onefile --windowed --name "GRB_Collection_Tracker" main.py
\`\`\`
The resulting executable will be created in \`dist\\GRB_Collection_Tracker.exe\`. Double-click to run on any Windows machine without needing Python!

## Excel Storage Structure (\`grb_data.xlsx\`)
- Sheets: Areas, Salesmen, SalesmanAreas, Bills, CollectionHistory, CashHandover
- Atomic safe saves prevent corruption.
- Human-readable and editable directly in Excel.
`
};

export async function downloadPythonProjectZip(mainPyCode: string, excelManagerPyCode: string): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('GRB_Collection_Tracker_Windows');
  if (!folder) return;

  folder.file('main.py', mainPyCode);
  folder.file('excel_manager.py', excelManagerPyCode);
  folder.file('requirements.txt', pythonSourceFiles['requirements.txt']);
  folder.file('build_exe.bat', pythonSourceFiles['build_exe.bat']);
  folder.file('installer.iss', pythonSourceFiles['installer.iss']);
  folder.file('README.md', pythonSourceFiles['README.md']);

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'GRB_Collection_Tracker_Windows_Python.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
