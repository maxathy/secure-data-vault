#!/bin/sh
set -e

echo "Syncing database schema (drizzle-kit push)..."
cd apps/vault-api && node ../../node_modules/drizzle-kit/bin.cjs push && cd ../..
echo "Schema sync complete."

exec node apps/vault-api/dist/main.js
