@echo off
"D:\deepclaw\node-win-x64\node_modules\cloudflared\bin\cloudflared.exe" tunnel run wellness-app --loglevel info >> "D:\deepclaw\projects\wellness_app\cf3.log" 2>&1
