@echo off
echo ========================================
echo Starting ACE V3 Orchestrator Server
echo ========================================
echo.

cd /d "%~dp0"

REM Use Anaconda Python
set PYTHON_PATH=C:\Users\jashs\anaconda3\python.exe

REM Check if Python is available
if not exist "%PYTHON_PATH%" (
    echo ERROR: Anaconda Python not found at %PYTHON_PATH%
    echo Please update PYTHON_PATH in this script
    pause
    exit /b 1
)

REM Ensure data directory exists
if not exist "data" mkdir data

REM Start the server
echo.
echo ========================================
echo ACE V3 Orchestrator Server Starting...
echo ========================================
echo.
echo Server will be available at:
echo   - API: http://localhost:8000
echo   - Docs: http://localhost:8000/docs
echo   - Runs: http://localhost:8000/runs
echo.
echo Press CTRL+C to stop the server
echo ========================================
echo.

"%PYTHON_PATH%" api\server.py

pause

