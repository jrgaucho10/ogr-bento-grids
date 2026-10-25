@echo off
setlocal EnableExtensions
title OGR Bento Grids Uninstaller

set "DEST_DIR=%APPDATA%\Adobe\CEP\extensions"
set "DEST=%DEST_DIR%\com.ogr.bentogrids"

if exist "%DEST%" rmdir /S /Q "%DEST%" >nul 2>&1
if exist "%DEST%" (
  echo Could not remove %DEST%
) else (
  echo Removed com.ogr.bentogrids.
)

for %%V in (9 10 11 12 13) do (
  reg delete "HKCU\Software\Adobe\CSXS.%%V" /v PlayerDebugMode /f >nul 2>&1
)
echo Disabled CEP PlayerDebugMode (CSXS 9-13).
echo Restart Illustrator to finish.
pause
exit /b 0
