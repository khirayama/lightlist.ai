#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const createEnvFile = (appPath, envContent) => {
  const envPath = path.join(appPath, '.env');
  const envExamplePath = path.join(appPath, '.env.example');
  
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, envContent);
    console.log(`Created ${envPath}`);
  } else {
    console.log(`${envPath} already exists, skipping...`);
  }
  
  if (!fs.existsSync(envExamplePath)) {
    fs.writeFileSync(envExamplePath, envContent);
    console.log(`Created ${envExamplePath}`);
  } else {
    console.log(`${envExamplePath} already exists, skipping...`);
  }
};

const setupAPI = () => {
  const apiPath = path.join(__dirname, '..', 'apps', 'api');
  const envContent = `DATABASE_URL="postgresql://lightlist_user:lightlist_password@localhost:5432/lightlist_db?schema=public"
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key-here-please-change-this-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=30d
API_RATE_LIMIT_MAX=100
API_RATE_LIMIT_WINDOW_MS=60000`;
  
  createEnvFile(apiPath, envContent);
};

const setupWeb = () => {
  const webPath = path.join(__dirname, '..', 'apps', 'web');
  const envContent = `NEXT_PUBLIC_API_URL=http://localhost:3001`;
  
  if (!fs.existsSync(webPath)) {
    fs.mkdirSync(webPath, { recursive: true });
  }
  
  createEnvFile(webPath, envContent);
};

const setupNative = () => {
  const nativePath = path.join(__dirname, '..', 'apps', 'native');
  const envContent = `EXPO_PUBLIC_API_URL=http://localhost:3001`;
  
  if (!fs.existsSync(nativePath)) {
    fs.mkdirSync(nativePath, { recursive: true });
  }
  
  createEnvFile(nativePath, envContent);
};

const main = () => {
  console.log('Setting up environment files...');
  
  setupAPI();
  setupWeb();
  setupNative();
  
  console.log('Environment files setup complete!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Run `npm run setup:dev` to start the development environment');
  console.log('2. Or run `npm run db:start` to start the database');
  console.log('3. Then run `npm run db:setup` to initialize the database');
  console.log('4. Finally run `npm run dev` to start the development servers');
};

main();