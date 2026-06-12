@echo off
cd /d D:\deepclaw\projects\wellness_app

:: 设置密钥（生产环境请替换为真实密钥）
set WELLNESS_SECRET=7519ab413fb10f9e4c224a223bc2fc0f8567d77884765ffd59aa02ad3d262bb2

:: 启动 PM2 服务
call npx pm2 start ecosystem.config.js --only wellness-server
echo Wellness App is running on http://localhost:8000
echo.
echo Visit: http://shishu.中国
echo Demo: http://shishu.中国/app?demo=demo
echo.
