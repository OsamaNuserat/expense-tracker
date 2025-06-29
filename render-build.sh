#!/bin/bash
set -e

echo "🔧 Installing dependencies..."
npm ci --include=dev

echo "🗃️ Generating Prisma client..."
npx prisma generate

echo "🚀 Running database migrations..."
npx prisma migrate deploy

echo "🏗️ Building TypeScript project..."
npm run build

echo "✅ Build completed successfully!"
