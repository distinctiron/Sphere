#!/bin/bash

# Script to clear Next.js cache and restart dev server
# Usage: ./dev.sh

echo "🛑 Stopping dev server..."
lsof -ti:3000 | xargs kill 2>/dev/null || echo "   (no server running)"

echo "🧹 Clearing .next cache..."
rm -rf .next

echo "🚀 Starting dev server..."
npm run dev

