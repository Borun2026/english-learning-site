@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo  英语语境学习 - 本地启动器
echo ============================================
where npm >nul 2>nul
if errorlevel 1 (
    echo [错误] 未找到 npm,请先安装 Node.js
    pause
    exit /b 1
)
if not exist node_modules (
    echo 首次运行,正在安装依赖(约1-3分钟)...
    call npm install --registry=https://registry.npmmirror.com --no-audit --no-fund
)
start /b cmd /c "timeout /t 2 /nobreak >nul & explorer http://127.0.0.1:5273"
echo 正在启动,浏览器将自动打开 http://127.0.0.1:5273
echo 关闭本窗口即停止服务。
call npm run dev -- --open
pause
