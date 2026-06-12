module.exports = {
  apps: [
    {
      name: 'wellness-server',
      script: 'server.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        WELLNESS_SECRET: '7519ab413fb10f9e4c224a223bc2fc0f8567d77884765ffd59aa02ad3d262bb2'
      },
      max_memory_restart: '300M',
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
