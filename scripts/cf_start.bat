@echo off
"D:\deepclaw\node-win-x64\node_modules\cloudflared\bin\cloudflared.exe" --config "C:\Users\程云\.cloudflared\config.yml" tunnel run wellness-app --loglevel info >> "D:\deepclaw\projects\wellness_app\cf4.log" 2>&1
