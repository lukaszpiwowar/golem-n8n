#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
until PGPASSWORD="${POSTGRES_PASSWORD}" psql -h postgres -U "${POSTGRES_USER}" -d postgres -c '\q' 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "Creating dashboard database if it doesn't exist..."
PGPASSWORD="${POSTGRES_PASSWORD}" psql -h postgres -U "${POSTGRES_USER}" -d postgres <<-EOSQL
    SELECT 'CREATE DATABASE dashboard'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'dashboard')\gexec
EOSQL

echo "Running migrations..."
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/dashboard"
node scripts/migrate.js

echo "Starting Next.js..."
exec node server.js

