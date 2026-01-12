#!/usr/bin/env node

import { createServer } from 'net';
import { spawn } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

// Get random port (300-4000)
function getRandomPort() {
  return Math.floor(Math.random() * (4000 - 300 + 1)) + 300;
}

// Update tauri.conf.json with the actual port
function updateTauriConfig(port) {
  const configPath = join(process.cwd(), 'src-tauri', 'tauri.conf.json');
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  
  // Update devPath to use the actual port
  config.build.devPath = `http://localhost:${port}`;
  
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  console.log(`✓ Updated devPath in tauri.conf.json to http://localhost:${port}\n`);
}

// Main logic
async function findAvailablePort() {
  const maxRetries = 5;
  let attempts = 0;

  console.log('🔍 Finding available port (range: 300-4000)\n');

  while (attempts < maxRetries) {
    const port = getRandomPort();
    console.log(`Trying port ${port} (${attempts + 1}/${maxRetries})`);

    if (await isPortAvailable(port)) {
      console.log(`✓ Port ${port} is available\n`);

      // Update Tauri config before starting
      updateTauriConfig(port);

      // Save port for reference
      const portFile = join(process.cwd(), '.tauri-dev-port');
      writeFileSync(portFile, String(port), 'utf-8');
      console.log(`✓ Port saved to ${portFile}\n`);

      return port;
    }

    attempts++;
  }

  throw new Error(`Failed to find available port in range 300-4000 after ${maxRetries} retries`);
}

// Execute
findAvailablePort()
  .then(port => {
    console.log(`🚀 Starting Vite on port ${port}...\n`);
    console.log('='.repeat(50) + '\n');

    const vite = spawn('npx', ['vite', '--port', String(port)], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, PORT: String(port) }
    });

    vite.on('error', err => {
      console.error('\n❌ Failed to start Vite:', err.message);
      process.exit(1);
    });

    process.on('SIGINT', () => {
      vite.kill('SIGINT');
      process.exit(0);
    });
  })
  .catch(err => {
    console.error('\n❌ Error:', err.message);
    console.error('\n💡 Suggestions:');
    console.error('   1. Check if other programs are using ports');
    console.error('   2. Try closing other dev servers');
    console.error('   3. Restart your computer to clear port usage');
    process.exit(1);
  });
