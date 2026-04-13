#!/usr/bin/env node

// Install npm packages for ride-service
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rideServicePath = path.join(__dirname, '../../services/ride-service');

console.log('Installing ride-service dependencies...');
try {
  process.chdir(rideServicePath);
  execSync('npm install', { stdio: 'inherit' });
  console.log('Installation successful!');
} catch (e) {
  console.error('Installation failed:', e.message);
  process.exit(1);
}
