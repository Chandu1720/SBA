#!/bin/bash

# Exit on error
set -e

# Build the frontend
echo "Building frontend..."
npm run build:frontend --prefix server

# Install backend dependencies
echo "Installing backend dependencies..."
npm install --prefix server --omit=dev

# Start the server
echo "Starting server..."
npm start --prefix server
