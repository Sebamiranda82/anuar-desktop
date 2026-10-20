[Setup]
AppName={{nombre}}
AppVersion={{version}}
AppPublisher={{editor}}
DefaultDirName={localappdata}\{{id}}
DefaultGroupName={{nombre}}
PrivilegesRequired=lowest
OutputDir=Output
OutputBaseFilename={{id}}-Setup
Compression=lzma2
SolidCompression=yes
DisableProgramGroupPage=yes
UninstallDisplayName={{nombre}}

[Files]
Source: "{{stage}}\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{userdesktop}\{{nombre}}"; Filename: "{app}\iniciar.bat"; WorkingDir: "{app}"
Name: "{userprograms}\{{nombre}}"; Filename: "{app}\iniciar.bat"; WorkingDir: "{app}"

[Run]
Filename: "{app}\iniciar.bat"; Description: "Abrir {{nombre}} ahora"; Flags: postinstall nowait skipifsilent
