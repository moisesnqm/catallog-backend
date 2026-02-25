#!/bin/sh
set -e

# Wait for Postgres and create database if missing, then run migrations, then start the app.
# Used in Coolify so the container can self-bootstrap without manual "Execute Command".

MAX_TRIES=${STARTUP_MAX_TRIES:-30}
SLEEP=${STARTUP_SLEEP:-2}

try_create_db() {
  node scripts/create-database.js
}

try_migrate() {
  node dist/database/run-migrations.js
}

attempt=1
while [ "$attempt" -le "$MAX_TRIES" ]; do
  if try_create_db; then
    break
  fi
  if [ "$attempt" -eq "$MAX_TRIES" ]; then
    echo "Could not create database or connect to Postgres after $MAX_TRIES attempts. Check DATABASE_URL and that Postgres is running."
    exit 1
  fi
  echo "Waiting for Postgres... attempt $attempt/$MAX_TRIES"
  sleep "$SLEEP"
  attempt=$((attempt + 1))
done

attempt=1
while [ "$attempt" -le "$MAX_TRIES" ]; do
  if try_migrate; then
    break
  fi
  if [ "$attempt" -eq "$MAX_TRIES" ]; then
    echo "Migrations failed after $MAX_TRIES attempts."
    exit 1
  fi
  echo "Waiting before running migrations... attempt $attempt/$MAX_TRIES"
  sleep "$SLEEP"
  attempt=$((attempt + 1))
done

exec "$@"
