@echo off
setlocal EnableExtensions
title OGR Bento Grids Installer

echo.
echo OGR Bento Grids installer
echo.

set "SRC=%~dp0"
set "DEST_DIR=%APPDATA%\Adobe\CEP\extensions"
set "DEST=%DEST_DIR%\com.ogr.bentogrids"

if not exist "%SRC%CSXS\manifest.xml" goto :missing_files
if not exist "%SRC%client\index.html" goto :missing_files

tasklist /FI "IMAGENAME eq Illustrator.exe" 2>nul | find /I "Illustrator.exe" >nul
if not errorlevel 1 goto :illustrator_running

echo Installing OGR Bento Grids into your user CEP extensions folder.
echo.

if not exist "%DEST_DIR%" mkdir "%DEST_DIR%" >nul 2>&1
if not exist "%DEST_DIR%" goto :dest_failed

if exist "%DEST%" rmdir /S /Q "%DEST%" >nul 2>&1
if exist "%DEST%" goto :dest_failed

mkdir "%DEST%" >nul 2>&1
if not exist "%DEST%" goto :dest_failed

echo Copying plugin files...
xcopy "%SRC%CSXS\*" "%DEST%\CSXS\" /E /I /Y /Q >nul
if errorlevel 1 goto :copy_failed
xcopy "%SRC%client\*" "%DEST%\client\" /E /I /Y /Q >nul
if errorlevel 1 goto :copy_failed
xcopy "%SRC%jsx\*" "%DEST%\jsx\" /E /I /Y /Q >nul
if errorlevel 1 goto :copy_failed
if exist "%SRC%README.md" copy /Y "%SRC%README.md" "%DEST%\README.md" >nul

set "REGFAIL=0"
for %%V in (9 10 11 12 13) do (
  reg add "HKCU\Software\Adobe\CSXS.%%V" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
  if errorlevel 1 set "REGFAIL=1"
)

if "%REGFAIL%"=="1" (
  echo Warning: could not enable CEP debug mode for every CSXS version.
) else (
  echo Enabled CEP PlayerDebugMode (CSXS 9-13).
)

for %%V in (11 12 13) do (
  reg add "HKCU\Software\Adobe\CSXS.%%V" /v LogLevel /t REG_SZ /d 6 /f >nul 2>&1
)
echo Set CEP LogLevel to 6 (all).

echo.
echo Done. Reopen Illustrator, then open:
echo   Window ^> Extensions ^> OGR Bento Grids
echo.
pause
exit /b 0

:missing_files
echo Error: the OGR Bento Grids files are incomplete.
goto :fail

:illustrator_running
echo Illustrator is running.
echo Quit Illustrator completely, then run install.bat again.
goto :fail

:dest_failed
echo Error: could not create or replace the extension folder:
echo   %DEST%
goto :fail

:copy_failed
echo Error: could not copy the plugin files.
goto :fail

:fail
echo.
pause
exit /b 1
