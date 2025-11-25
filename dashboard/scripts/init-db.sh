#!/bin/bash
set -e

echo "Waiting for PostgreSQL to be ready..."
until PGPASSWORD="${POSTGRES_PASSWORD:-n8n}" psql -h postgres -U "${POSTGRES_USER:-n8n}" -d postgres -c '\q' 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "Creating dashboard database if it doesn't exist..."
PGPASSWORD="${POSTGRES_PASSWORD:-n8n}" psql -h postgres -U "${POSTGRES_USER:-n8n}" -d postgres <<-EOSQL
    SELECT 'CREATE DATABASE dashboard'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'dashboard')\gexec
EOSQL

echo "Running migrations..."
npm run db:migrate

echo "Database initialization complete!"

