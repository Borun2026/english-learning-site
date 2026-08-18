@echo off
chcp 65001 >nul
setlocal EnableExtensions
title 英语语境学习系统 - 构建 english-app.exe

cd /d "%~dp0"

echo ================================================================
echo   构建 english-app.exe (前端 dist 内嵌, 不含音频)
echo ================================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [错误] 未找到 Node.js
    exit /b 1
)
where go >nul 2>nul
if errorlevel 1 (
    echo [错误] 未找到 Go。请先安装: scoop install go  或  https://go.dev/dl/
    exit /b 1
)

if not exist "node_modules" (
    echo [1/4] 安装 npm 依赖...
    call npm install --registry=https://registry.npmmirror.com --no-audit --no-fund
    if errorlevel 1 exit /b 1
) else (
    echo [1/4] npm 依赖已就绪
)

echo [2/4] 构建前端 (暂时移开音频目录以免打进 dist)...
set "AUDIO_SRC=%cd%\public\content\audio"
set "AUDIO_PARK=%cd%\..\_audio_tmp_build"
set "MOVED_AUDIO=0"
if exist "%AUDIO_SRC%" (
    if exist "%AUDIO_PARK%" rmdir /s /q "%AUDIO_PARK%"
    move /y "%AUDIO_SRC%" "%AUDIO_PARK%" >nul
    set "MOVED_AUDIO=1"
)

call npm run build
set "BUILD_ERR=%ERRORLEVEL%"

if "%MOVED_AUDIO%"=="1" (
    if not exist "%cd%\public\content" mkdir "%cd%\public\content"
    move /y "%AUDIO_PARK%" "%AUDIO_SRC%" >nul
)

if not "%BUILD_ERR%"=="0" (
    echo [错误] npm run build 失败
    exit /b 1
)

echo [3/4] 复制 dist 到 server\dist (排除 audio)...
if not exist "server\dist" mkdir "server\dist"
robocopy "dist" "server\dist" /MIR /XD audio /NFL /NDL /NJH /NJS /nc /ns /np
if errorlevel 8 (
    echo [错误] 复制 dist 失败
    exit /b 1
)

echo [4/4] 编译 Go 单文件...
set "GOPROXY=https://goproxy.cn,direct"
set "CGO_ENABLED=0"
pushd server
go mod tidy
if errorlevel 1 (
    popd
    echo [错误] go mod tidy 失败
    exit /b 1
)
go build -ldflags "-s -w" -o "..\..\english-app.exe" .
if errorlevel 1 (
    popd
    echo [错误] go build 失败
    exit /b 1
)
popd

if not exist "..\data\english_core.db" (
    echo.
    echo 未检测到 data\english_core.db, 正在灌库...
    python scripts\init_database.py
)

echo.
echo ================================================================
echo  完成: %~dp0..\english-app.exe
echo  数据: %~dp0..\data\
echo  音频: public\content\audio (运行时由 exe 读取, 未打进 exe)
echo ================================================================
exit /b 0
