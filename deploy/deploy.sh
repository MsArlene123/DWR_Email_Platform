#!/bin/bash
# =====================================================================
# DEPLOY the latest GitHub build to this droplet.
# Requires: GITHUB_TOKEN with read access to MsArlene123/DWR_Email_Platform
# stored in /var/www/dwr-email/shared/github_token (chmod 600).
# Downloads the finished package, installs it beside the previous
# release, creates the database tables if needed, and switches over.
# Rollback is one symlink change away.
# =====================================================================
set -e
APP_DIR=/var/www/dwr-email
REPO=MsArlene123/DWR_Email_Platform
TOKEN=$(cat $APP_DIR/shared/github_token)
STAMP=$(date +%Y%m%d-%H%M%S)
NEW=$APP_DIR/releases/$STAMP

echo "== Downloading latest build package from GitHub =="
ASSET_URL=$(curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.github.com/repos/$REPO/releases/tags/latest \
  | grep -o '"url": *"[^"]*assets/[0-9]*"' | head -1 | sed 's/.*"url": *"\(.*\)"/\1/')
[ -n "$ASSET_URL" ] || { echo "No build package found. Has GitHub Actions finished?"; exit 1; }

mkdir -p "$NEW"
curl -sL -H "Authorization: Bearer $TOKEN" -H "Accept: application/octet-stream" \
  "$ASSET_URL" | tar -xz -C "$NEW"

echo "== Linking environment =="
ln -sf $APP_DIR/shared/.env "$NEW/.env"

echo "== Creating/updating database tables =="
cd "$NEW"
set -a; source $APP_DIR/shared/.env; set +a
npx --yes prisma@6.7.0 db push --schema prisma/schema.prisma --skip-generate

echo "== Switching to new release and restarting =="
chown -R www-data:www-data "$NEW"
ln -sfn "$NEW" $APP_DIR/current
systemctl restart dwr-email
sleep 3
systemctl is-active dwr-email && echo "DEPLOY SUCCESSFUL: $STAMP"

echo "== Cleaning old releases (keeping newest 5) =="
ls -1dt $APP_DIR/releases/* | tail -n +6 | xargs -r rm -rf
