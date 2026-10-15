@echo off
cd /d C:\Toldos
where git >NUL 2>NUL || (echo O Git nao esta instalado. Baixe em https://git-scm.com/download/win & pause & exit /b 1)
if exist .git (echo Esta pasta ja esta ligada ao Git. & git remote -v & pause & exit /b 0)
git init -b main
git remote add origin https://github.com/Nexvyra-studio/LtToldos.git
git fetch origin
git reset origin/main
git branch --set-upstream-to=origin/main main
echo.
echo Pronto! A pasta C:\Toldos esta ligada ao repositorio LtToldos.
git status --short
pause
