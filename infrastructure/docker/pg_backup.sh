#!/bin/bash

# Configuration settings
DB_HOST=${POSTGRES_SERVER:-"db"}
DB_USER=${POSTGRES_USER:-"postgres"}
DB_NAME=${POSTGRES_DB:-"privacyshield"}
BACKUP_DIR="/workspace/db_backups"
RETENTION_DAYS=7

# Set PGPASSWORD to avoid prompt
export PGPASSWORD=${POSTGRES_PASSWORD:-"postgres"}

# Get current timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_backup_${TIMESTAMP}.sql.gz"

echo "Starting database backup at $(date)..."

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Run pg_dump and compress the output stream
pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" | gzip > "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    echo "Backup successfully created: ${BACKUP_FILE}"
else
    echo "ERROR: Backup dump execution failed!" >&2
    exit 1
fi

# Prune backups older than retention policy limit
echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "${DB_NAME}_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

echo "Backup maintenance cycle complete."
