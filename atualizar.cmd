@echo off
cd /d "%~dp0"
echo.
echo Atualizando o painel do mercado...
echo.
node importar.cjs --mercado "Mercado do Parceiro"
if errorlevel 1 goto erro
node gerar-painel.cjs
if errorlevel 1 goto erro
echo.
start "" "painel-mercado.html"
goto fim

:erro
echo.
echo Falhou. Confira os CSVs em dados\ e o mapeamento em config\mapeamento.json.
pause

:fim
