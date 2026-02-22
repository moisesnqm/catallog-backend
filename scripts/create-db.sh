#!/usr/bin/env sh
# Creates the catallog database in the Postgres container if it does not exist.
# Run after: docker compose up -d

set -e
DB_NAME="${POSTGRES_DB:-catallog}"
docker compose exec postgres psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1 \
  || docker compose exec postgres psql -U postgres -c "CREATE DATABASE ${DB_NAME};"
echo "Database ${DB_NAME} is ready."
