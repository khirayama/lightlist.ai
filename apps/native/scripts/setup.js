#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// .envファイルのパス
const envPath = path.join(__dirname, '..', '.env');

// .envファイルの内容
const envContent = `EXPO_PUBLIC_API_URL=http://localhost:3001
`;

// .envファイルを作成（既に存在する場合は上書きしない）
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created successfully');
} else {
  console.log('ℹ️  .env file already exists, skipping creation');
}

console.log('✅ Native app setup completed');