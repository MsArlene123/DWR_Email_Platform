#!/bin/bash
# =====================================================================
# ONE-TIME DROPLET SETUP for the DWR Email Dashboard
# Run as root on the DigitalOcean droplet. Safe to re-run.
# Prepares: swap file, Node 22, PostgreSQL, app directories, systemd
# service, nginx site, nightly database backup, and the email heartbeat
# cron. It does NOT touch existing sites.
# =====================================================================
set -e

APP_DIR=/var/www/dwr-email
DOMAIN=email.docwritereview.work

echo "== 1/8 Swap file (fire extinguisher for memory spikes) =="
if ! swapon --show | grep -q swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile
  mkswap /swapfile && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "   2 GB swap created."
else
  echo "   Swap already present, skipping."
fi

echo "== 2/8 Node.js 20 =="
if ! command -v node >/dev/null || [ "$(node -v | cut -c2-3)" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y nodejs >/dev/null
fi
echo "   Node $(node -v)"

echo "== 3/8 PostgreSQL =="
apt-get install -y postgresql >/dev/null
systemctl enable --now postgresql
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='dwr_email'" | grep -q 1; then
  DB_PASS=$(openssl rand -hex 16)
  sudo -u postgres psql -c "CREATE USER dwr_email WITH PASSWORD '$DB_PASS';"
  sudo -u postgres psql -c "CREATE DATABASE dwr_email OWNER dwr_email;"
  echo "   Database created. CONNECTION STRING (copy into shared/.env):"
  echo "   DATABASE_URL=postgresql://dwr_email:$DB_PASS@localhost:5432/dwr_email"
else
  echo "   Database already exists, skipping."
fi

echo "== 4/8 App directories =="
mkdir -p $APP_DIR/releases $APP_DIR/shared /var/backups/dwr-email
if [ ! -f $APP_DIR/shared/.env ]; then
  cat > $APP_DIR/shared/.env << 'ENV'
# Fill every value, then run deploy.sh
DATABASE_URL=
NEXTAUTH_URL=https://email.docwritereview.work
NEXTAUTH_SECRET=
CRON_SECRET=
ENCRYPTION_KEY=
PORT=3001
ENV
  chmod 600 $APP_DIR/shared/.env
  echo "   Created $APP_DIR/shared/.env  <-- FILL THIS IN"
fi

echo "== 5/8 systemd service =="
cp "$(dirname "$0")/dwr-email.service" /etc/systemd/system/dwr-email.service
systemctl daemon-reload && systemctl enable dwr-email

echo "== 6/8 nginx site =="
apt-get install -y nginx >/dev/null
cp "$(dirname "$0")/nginx-dwr-email.conf" /etc/nginx/sites-available/$DOMAIN
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
nginx -t && systemctl reload nginx
echo "   After DNS points here, run: certbot --nginx -d $DOMAIN"

echo "== 7/8 Nightly database backup at 3:15 AM =="
cp "$(dirname "$0")/backup-db.sh" /usr/local/bin/dwr-email-backup.sh
chmod +x /usr/local/bin/dwr-email-backup.sh
( crontab -l 2>/dev/null | grep -v dwr-email-backup ; echo "15 3 * * * /usr/local/bin/dwr-email-backup.sh" ) | crontab -

echo "== 8/8 Email heartbeat every 2 minutes =="
echo "   Add AFTER first deploy and HTTPS, with your CRON_SECRET:"
echo '   */2 * * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://email.docwritereview.work/api/process-all >/dev/null'
echo
echo "SETUP COMPLETE. Next: fill shared/.env, point DNS, run certbot, then deploy.sh"
