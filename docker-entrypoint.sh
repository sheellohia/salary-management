#!/bin/sh
set -e

# Seed the database on first boot (idempotent: only if the file is absent so a
# mounted volume keeps its data across restarts).
if [ ! -f "$DATABASE_PATH" ]; then
  echo "No database at $DATABASE_PATH — seeding 10,000 employees..."
  npm run seed --workspace server
fi

echo "Starting Salary Management on port $PORT"
exec node server/dist/index.js
