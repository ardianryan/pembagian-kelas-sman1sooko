const path = require('path');

const root = path.join(__dirname, '..');
const backendDir = path.join(root, 'apps/backend');

module.exports = {
  apps: [
    {
      name: 'sman1sooko-kelas-api',
      cwd: backendDir,
      script: 'dist/src/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: path.join(root, 'logs/api-error.log'),
      out_file: path.join(root, 'logs/api-out.log'),
      merge_logs: true,
      time: true,
    },
  ],
};