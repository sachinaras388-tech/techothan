/**
 * PM2 Ecosystem Configuration
 * For production deployment with PM2 process manager
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup
 */

module.exports = {
  apps: [
    // Backend API Server
    {
      name: 'fraud-detection-api',
      script: './backend/server.js',
      cwd: './',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      kill_timeout: 5000,
      restart_delay: 4000
    },
    // AI Detection Service
    {
      name: 'fraud-detection-ai',
      script: './ai-service/main.py',
      cwd: './',
      interpreter: 'python',
      instances: 1,
      exec_mode: 'fork',
      env: {
        PORT: 8000,
        AI_SERVICE_API_KEY: 'dev-key'
      },
      env_production: {
        PORT: 8000,
        AI_SERVICE_API_KEY: 'prod-key'
      },
      error_file: './logs/ai-error.log',
      out_file: './logs/ai-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      kill_timeout: 5000,
      restart_delay: 4000
    }
  ]
};

