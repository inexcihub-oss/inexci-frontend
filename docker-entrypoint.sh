#!/bin/sh
set -e

echo "📦 Installing dependencies..."
npm install --prefer-offline --no-audit --no-fund

echo "✅ Starting application..."
exec npm run dev
