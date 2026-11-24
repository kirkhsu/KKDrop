; KKDrop Windows installer
; Built with: makensis -DAPP_VERSION=<ver> -DAPP_EXE=<path\to\KKDrop.exe> -DAPP_ICON=<path\to\icon.ico> -DOUT_FILE=<output.exe> installer/kkdrop.nsi
; (see scripts/build-win-installer.js, which supplies these defines automatically)

!ifndef APP_VERSION
  !define APP_VERSION "0.0.0"
!endif
!ifndef APP_EXE
  !define APP_EXE "..\build\win\KKDrop.exe"
!endif
!ifndef APP_ICON
  !define APP_ICON "..\assets\icon.ico"
!endif
!ifndef OUT_FILE
  !define OUT_FILE "..\dist\KKDrop-Setup-${APP_VERSION}.exe"
!endif

!define APP_NAME "KKDrop"
!define APP_PUBLISHER "KKDrop"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"

Unicode true

!include "MUI2.nsh"

Name "${APP_NAME}"
OutFile "${OUT_FILE}"
InstallDir "$PROGRAMFILES64\${APP_NAME}"
InstallDirRegKey HKLM "${UNINST_KEY}" "InstallLocation"
RequestExecutionLevel admin
SetCompressor /SOLID lzma

!define MUI_ABORTWARNING
!define MUI_ICON "${APP_ICON}"
!define MUI_UNICON "${APP_ICON}"

!define MUI_FINISHPAGE_RUN "$INSTDIR\KKDrop.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Start KKDrop now"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section "KKDrop" SEC_APP
  SetShellVarContext all
  SetOutPath "$INSTDIR"
  File "${APP_EXE}"
  File "${APP_ICON}"

  ; Start Menu shortcuts (all users)
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortCut "$SMPROGRAMS\${APP_NAME}\KKDrop.lnk" "$INSTDIR\KKDrop.exe" "" "$INSTDIR\icon.ico"
  CreateShortCut "$SMPROGRAMS\${APP_NAME}\Uninstall KKDrop.lnk" "$INSTDIR\Uninstall.exe"

  ; Autostart on login (all users) - mirrors the Linux package's XDG autostart entry
  CreateShortCut "$SMSTARTUP\KKDrop.lnk" "$INSTDIR\KKDrop.exe" "" "$INSTDIR\icon.ico"

  WriteUninstaller "$INSTDIR\Uninstall.exe"

  WriteRegStr HKLM "${UNINST_KEY}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKLM "${UNINST_KEY}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKLM "${UNINST_KEY}" "Publisher" "${APP_PUBLISHER}"
  WriteRegStr HKLM "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\icon.ico"
  WriteRegStr HKLM "${UNINST_KEY}" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegDWORD HKLM "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKLM "${UNINST_KEY}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  SetShellVarContext all

  Delete "$INSTDIR\KKDrop.exe"
  Delete "$INSTDIR\icon.ico"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"

  Delete "$SMPROGRAMS\${APP_NAME}\KKDrop.lnk"
  Delete "$SMPROGRAMS\${APP_NAME}\Uninstall KKDrop.lnk"
  RMDir "$SMPROGRAMS\${APP_NAME}"
  Delete "$SMSTARTUP\KKDrop.lnk"

  DeleteRegKey HKLM "${UNINST_KEY}"
SectionEnd
