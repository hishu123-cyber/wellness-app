@echo off
"D:\deepclaw\node-win-x64\node_modules\cloudflared\bin\cloudflared.exe" tunnel run --credentials-file "D:\deepclaw\.cloudflared-wellness.json" wellness-app --loglevel info >> "D:\deepclaw\projects\wellness_app\cf2.log" 2>&1
