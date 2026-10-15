@echo off
chcp 65001 >NUL
cd /d "%~dp0"

set "GIT=git"
where git >NUL 2>NUL
if errorlevel 1 (
  if exist "%ProgramFiles%\Git\cmd\git.exe" (
    set "GIT=%ProgramFiles%\Git\cmd\git.exe"
  ) else (
    echo O Git nao foi encontrado.
    pause
    exit /b 1
  )
)

rem Nome e e-mail do autor (pede so se estiverem vazios)
set "NOME="
for /f "usebackq delims=" %%i in (`"%GIT%" config user.name 2^>NUL`) do set "NOME=%%i"
if defined NOME goto temnome
set /p NOME=Seu nome para os commits: 
"%GIT%" config --global user.name "%NOME%"
:temnome
set "EMAIL="
for /f "usebackq delims=" %%i in (`"%GIT%" config user.email 2^>NUL`) do set "EMAIL=%%i"
if defined EMAIL goto temail
set /p EMAIL=Seu e-mail do GitHub: 
"%GIT%" config --global user.email "%EMAIL%"
:temail
echo Autor: %NOME% ^<%EMAIL%^>

echo.
echo Arquivos alterados:
"%GIT%" status --short
"%GIT%" add -A
"%GIT%" diff --cached --quiet
if not errorlevel 1 (
  echo.
  echo Nada novo para enviar.
  pause
  exit /b 0
)

echo.
set "MSG="
set /p MSG=Descreva a mudanca (Enter para usar a data): 
if "%MSG%"=="" set "MSG=Atualizacao %DATE% %TIME:~0,5%"

"%GIT%" commit -m "%MSG%"
if errorlevel 1 (
  echo Nao foi possivel criar o commit.
  pause
  exit /b 1
)

echo.
echo Enviando para o GitHub...
"%GIT%" push
if errorlevel 1 (
  echo.
  echo Nao foi possivel enviar. Confira a internet e o login do GitHub.
  pause
  exit /b 1
)

echo.
echo Pronto! Enviado para o GitHub.
pause
