{
  "name": "wellness-app",
  "script": "server.js",
  "instances": 1,
  "exec_mode": "fork",
  "env": {
    "NODE_ENV": "production",
    "PORT": 8000,
    "WELLNESS_SECRET": "ICMvGJjRnKpN71z8bSfXkHP4Ftm3Q6VWDYExsyOe5L2qUhol"
  },
  "error_file": "logs/pm2-error.log",
  "out_file": "logs/pm2-out.log",
  "merge_logs": true,
  "max_memory_restart": "500M",
  "autorestart": true,
  "max_restarts": 10,
  "restart_delay": 5000
}
