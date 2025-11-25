#!/usr/bin/env node
/**
 * Dashboard startup script that reads port from database
 * This script reads DASHBOARD_PORT from the SQLite database and starts Next.js with that port
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Database path (relative to project root)
const DB_PATH = path.join(__dirname, '..', 'data', 'orb_mining.db');

async function getPortFromDatabase() {
  try {
    // Check if database exists
    if (!fs.existsSync(DB_PATH)) {
      console.log('Database not found, using default port 3888');
      return 3888;
    }

    // Dynamically import better-sqlite3
    const Database = require('better-sqlite3');
    const db = new Database(DB_PATH, { readonly: true });

    try {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('DASHBOARD_PORT');

      if (row && row.value) {
        const port = parseInt(row.value);
        if (port >= 1024 && port <= 65535) {
          console.log(`Using port ${port} from database`);
          return port;
        }
      }
    } finally {
      db.close();
    }
  } catch (error) {
    console.warn('Failed to read port from database:', error.message);
  }

  console.log('Using default port 3888');
  return 3888;
}

async function startDashboard() {
  const port = await getPortFromDatabase();
  const isDev = process.argv.includes('--dev');
  const command = isDev ? 'dev' : 'start';

  console.log(`Starting dashboard in ${isDev ? 'development' : 'production'} mode on port ${port}...`);

  // Set environment variables
  const env = {
    ...process.env,
    PORT: port.toString(),
    HOSTNAME: '0.0.0.0', // Bind to all interfaces for remote access
  };

  // Start Next.js
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const child = spawn(npm, ['run', command], {
    env,
    stdio: 'inherit',
    cwd: __dirname,
    shell: true, // Use shell to properly resolve npm.cmd on Windows
  });

  child.on('error', (error) => {
    console.error('Failed to start dashboard:', error);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    child.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
  });
}

startDashboard().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
