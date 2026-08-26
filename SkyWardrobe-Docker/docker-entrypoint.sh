#!/bin/sh
set -e

DB_FILE="${DATABASE_PATH:-wardrobe.db}"

# Ensure parent directory for database exists if a path is specified
DB_DIR=$(dirname "$DB_FILE")
if [ "$DB_DIR" != "." ] && [ ! -d "$DB_DIR" ]; then
  mkdir -p "$DB_DIR"
fi

# Initialize and seed database if the database file does not exist
if [ ! -f "$DB_FILE" ]; then
  echo "==> $DB_FILE not found. Initializing and seeding database..."
  node scripts/init-db.js
  node scripts/seed-fashiongen.js
  echo "==> Wardrobe database initialization complete."
fi

# Build client-side configuration using runtime environment variables
echo "==> Building client config (www/config.js)..."
node scripts/build-www.js

echo "==> Starting SkyWardrobe server..."
exec "$@"
