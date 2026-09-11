@echo off
setlocal

rem Reproducible Windows release build. This script reuses local tool caches;
rem it deliberately does not download SDKs or other tools.
set "ROOT=%~dp0.."
set "MSVCBIN=C:\Program Files\Microsoft Visual Studio\18\Community\VC\Tools\MSVC\14.50.35717\bin\Hostx64\x64"
set "RCBIN=%ROOT%\.xwin-tool\sdk-buildtools\bin\10.0.26100.0\x64"
set "XWIN=%ROOT%\.xwin"

if not exist "%MSVCBIN%\cl.exe" (
  echo Missing cl.exe: %MSVCBIN%
  exit /b 1
)
if not exist "%MSVCBIN%\link.exe" (
  echo Missing link.exe: %MSVCBIN%
  exit /b 1
)
if not exist "%RCBIN%\rc.exe" (
  echo Missing rc.exe: %RCBIN%
  exit /b 1
)
if not exist "%XWIN%\crt\lib\x86_64" (
  echo Missing xwin CRT cache: %XWIN%
  exit /b 1
)

set "PATH=%MSVCBIN%;%RCBIN%;C:\Program Files\nodejs;%USERPROFILE%\.cargo\bin;%SystemRoot%\system32;%SystemRoot%"
set "LIB=%XWIN%\crt\lib\x86_64;%XWIN%\sdk\lib\ucrt\x86_64;%XWIN%\sdk\lib\um\x86_64"
set "INCLUDE=%XWIN%\crt\include;%XWIN%\sdk\include\ucrt;%XWIN%\sdk\include\shared;%XWIN%\sdk\include\um;%XWIN%\sdk\include\winrt"

cd /d "%ROOT%"
call npx tauri build
exit /b %ERRORLEVEL%
