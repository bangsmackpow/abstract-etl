#!/bin/sh
set -e

# Fix ownership of mounted volumes so appuser can write.
# Handles named volumes created under root or a prior appuser UID
# (the root cause of "attempt to write a readonly database").
chown -R appuser:appgroup /app/data /app/backups /app/src/uploads 2>/dev/null || true

# Drop privileges to appuser and run the app
exec su-exec appuser:appgroup "$@"
