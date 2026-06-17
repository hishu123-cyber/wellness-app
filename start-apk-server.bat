@echo off
chcp 65001 >nul 2>&1
title 食术养生 - APK下载服务器
cd /d "%~dp0"
echo.
echo ╔══════════════════════════════════════╗
echo ║   食术养生 APK下载服务器 v0.1        ║
echo ╚══════════════════════════════════════╝
echo.
node apk-server.js
