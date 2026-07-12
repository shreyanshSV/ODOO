@echo off
cd /d "%~dp0"
where pythonw >nul 2>nul && (start "" pythonw gui.py & goto :eof)
where python  >nul 2>nul && (start "" python  gui.py & goto :eof)
echo Python is not installed.
echo Get it from https://python.org  (tick "Add Python to PATH" during install),
echo then double-click this file again.
pause
