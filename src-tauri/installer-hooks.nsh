; Optional per-user PATH registration for the command-line preview mode.
; The checkbox is enabled by default and requires no administrator rights.
!include nsDialogs.nsh
!include LogicLib.nsh
!include WinMessages.nsh
!include StrFunc.nsh
${StrStr}

Var AddToPathCheckbox

Function AddToPathPage
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}
  ${NSD_CreateLabel} 0 0 100% 24u "Command-line access"
  Pop $0
  ${NSD_CreateCheckbox} 0 30u 100% 12u "Add Markdown Editor to my user PATH (recommended)"
  Pop $AddToPathCheckbox
  ${NSD_Check} $AddToPathCheckbox
  nsDialogs::Show
FunctionEnd

Function AddToPathPageLeave
  ${NSD_GetState} $AddToPathCheckbox $0
  ${If} $0 == ${BST_CHECKED}
    ReadRegStr $1 HKCU "Environment" "Path"
    ${StrStr} $2 $1 "$INSTDIR"
    ${If} $2 == ""
      ${If} $1 == ""
        StrCpy $1 "$INSTDIR"
      ${Else}
        StrCpy $1 "$1;$INSTDIR"
      ${EndIf}
      WriteRegExpandStr HKCU "Environment" "Path" $1
      SendMessage ${HWND_BROADCAST} ${WM_SETTINGCHANGE} 0 "STR:Environment" /TIMEOUT=2000
    ${EndIf}
  ${EndIf}
FunctionEnd

Page custom AddToPathPage AddToPathPageLeave
