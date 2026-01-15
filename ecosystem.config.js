module.exports = {
  apps: [
    {
      name: 'aura-backend',
      script: 'dist/server/index.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      exp_backoff_restart_delay: 100
    }
  ]
};
