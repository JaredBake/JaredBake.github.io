@echo off
setlocal enabledelayedexpansion

set "ENV_FILE=%~dp0..\.env"
if not exist "%ENV_FILE%" (
  echo [figma-mcp] Missing .env file at "%ENV_FILE%" 1>&2
  exit /b 1
)

for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
  if /I "%%A"=="FIGMA_API_KEY" set "FIGMA_API_KEY=%%B"
)

if "%FIGMA_API_KEY%"=="" (
  echo [figma-mcp] FIGMA_API_KEY not found in .env 1>&2
  exit /b 1
)

npx -y figma-developer-mcp --stdio
