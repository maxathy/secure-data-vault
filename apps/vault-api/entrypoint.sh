#!/bin/sh
set -e

echo "Syncing database schema (drizzle-kit push)..."
npx drizzle-kit push --config=apps/vault-api/drizzle.config.ts
echo "Schema sync complete."

exec node apps/vault-api/dist/main.js
