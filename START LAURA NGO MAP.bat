@echo off
setlocal
title LAURA Food Donation
set "LAURA_APP_ROOT=%~dp0"
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -Command "$taskLauncher = Join-Path $env:LAURA_APP_ROOT 'Start-WebApp.ps1'; & ([scriptblock]::Create([IO.File]::ReadAllText($taskLauncher))) -NoBrowser:($env:LAURA_NO_BROWSER -eq '1')"
if errorlevel 1 (
  echo.
  echo Could not start LAURA Food Donation. Please keep all extracted files together.
  pause
)
endlocal
