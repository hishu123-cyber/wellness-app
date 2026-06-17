@echo off
chcp 65001 >nul
title 食术养生 - 服务器启动

echo ============================================
echo    食术养生 - 体质养生大健康
echo    服务器启动脚本
echo ============================================
echo.

:: 检查环境变量
if "%WELLNESS_SECRET%"=="" (
    echo [提示] 未设置 WELLNESS_SECRET, 使用开发模式密钥
    set WELLNESS_SECRET=ICMvGJjRnKpN71z8bSfXkHP4Ftm3Q6VWDYExsyOe5L2qUhol
)

:: 进入项目目录
cd /d "%~dp0"

:: 检查 node_modules
if not exist "node_modules" (
    echo [安装] 正在安装依赖...
    call npm install
    echo.
)

:: 检查数据库
if not exist "backend\data\" (
    mkdir backend\data 2>nul
)
if not exist "backend\data\backups\" (
    mkdir backend\data\backups 2>nul
)

:: 清理旧日志
if exist "logs\crash.log" del "logs\crash.log" 2>nul

:: 启动服务器
echo [启动] 正在启动服务...
echo.
echo  - 地址: http://localhost:8000
echo  - 首页: http://localhost:8000
echo  - 健康检查: http://localhost:8000/api/health
echo  - API: http://localhost:8000/api/*
echo  - APP: http://localhost:8000/app
echo.
echo  测试账号: demo / 123456
echo.
echo  按 Ctrl+C 停止服务器
echo ============================================
echo.

node server.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [错误] 服务器启动失败，错误码: %ERRORLEVEL%
    pause
)
