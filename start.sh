#!/bin/bash

# BMS Build and Run Script

echo "🚀 BMS Application Setup and Run"
echo "================================="

# Navigate to root
cd "$(dirname "$0")" || exit

# Check if dependencies are installed
echo "📦 Checking dependencies..."

if [ ! -d "server/node_modules" ]; then
  echo "Installing server dependencies..."
  cd server
  npm install
  cd ..
fi

if [ ! -d "bms-frontend-ts/node_modules" ]; then
  echo "Installing frontend dependencies..."
  cd bms-frontend-ts
  npm install
  cd ..
fi

# Build frontend
echo "🏗️ Building frontend..."
cd bms-frontend-ts
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Frontend build failed"
  exit 1
fi
cd ..

echo "✅ Frontend build complete"

# Start server
echo "🎯 Starting server..."
cd server
npm start
