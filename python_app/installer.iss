; Inno Setup Script for GRB Collection Tracker
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
DefaultDirName={autopf}\GRB_Collection_Tracker
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
Source: "dist\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
; NOTE: The grb_data.xlsx file is generated automatically in {app} or user documents on first launch

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
