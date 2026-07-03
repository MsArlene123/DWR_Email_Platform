#!/bin/bash
# Nightly PostgreSQL backup, keeps 14 days.
set -e
STAMP=$(date +%Y-%m-%d)
sudo -u postgres pg_dump dwr_email | gzip > /var/backups/dwr-email/dwr_email_$STAMP.sql.gz
find /var/backups/dwr-email -name "*.sql.gz" -mtime +14 -delete
