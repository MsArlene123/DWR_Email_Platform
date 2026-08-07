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
STAMP=$(date +%Y%m%d-%H%M%S)
NEW=$APP_DIR/releases/$STAMP

# ─── 1. Read + validate the token ─────────────────────────────────────────
if [[ ! -f "$APP_DIR/shared/github_token" ]]; then
  echo "ERROR: Token file not found at $APP_DIR/shared/github_token"
  echo "Create it with:"
  echo "  nano $APP_DIR/shared/github_token     # paste your GitHub PAT"
  echo "  chmod 600 $APP_DIR/shared/github_token"
  exit 1
fi
TOKEN=$(cat "$APP_DIR/shared/github_token")
# Trim trailing whitespace/newlines
TOKEN="$(echo -n "$TOKEN" | tr -d '[:space:]')"
if [[ -z "$TOKEN" ]]; then
  echo "ERROR: Token file is empty: $APP_DIR/shared/github_token"
  echo "Paste a GitHub PAT with 'Contents: read' permission for $REPO"
  exit 1
fi

# ─── 2. Validate token + repo access ──────────────────────────────────────
echo "== Validating GitHub token =="
HTTP_CODE=$(curl -s -o /tmp/gh_user_check.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  https://api.github.com/user)
if [[ "$HTTP_CODE" != "200" ]]; then
  echo "ERROR: GitHub token is invalid or expired (HTTP $HTTP_CODE)."
  echo "Response: $(cat /tmp/gh_user_check.json | head -c 300)"
  echo ""
  echo "Generate a new PAT at https://github.com/settings/tokens with"
  echo "'Contents: read' scope for $REPO, then:"
  echo "  nano $APP_DIR/shared/github_token     # paste the new token"
  echo "  chmod 600 $APP_DIR/shared/github_token"
  exit 1
fi
GH_USER=$(cat /tmp/gh_user_check.json | grep -o '"login": *"[^"]*"' | head -1 | sed 's/.*"login": *"\(.*\)"/\1/')
echo "  Token valid. Authenticated as: $GH_USER"

# ─── 3. Verify repo access ────────────────────────────────────────────────
HTTP_CODE=$(curl -s -o /tmp/gh_repo_check.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  https://api.github.com/repos/$REPO)
if [[ "$HTTP_CODE" != "200" ]]; then
  echo "ERROR: Token cannot access $REPO (HTTP $HTTP_CODE)."
  echo "Response: $(cat /tmp/gh_repo_check.json | head -c 300)"
  echo ""
  echo "If this is a fine-grained PAT, edit it at"
  echo "https://github.com/settings/personal-access-tokens and add"
  echo "$REPO under 'Repository access' with 'Contents: read' permission."
  exit 1
fi
echo "  Repository access confirmed: $REPO"

# ─── 4. Download the latest build package ─────────────────────────────────
echo "== Downloading latest build package from GitHub =="
RELEASE_JSON=$(curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.github.com/repos/$REPO/releases/tags/latest)

# Check the release exists
RELEASE_TAG=$(echo "$RELEASE_JSON" | grep -o '"tag_name": *"[^"]*"' | head -1 | sed 's/.*"tag_name": *"\(.*\)"/\1/')
if [[ "$RELEASE_TAG" != "latest" ]]; then
  echo "ERROR: No release tagged 'latest' found."
  echo "Has GitHub Actions finished? Check:"
  echo "  https://github.com/$REPO/actions"
  echo ""
  echo "Release API response: $(echo "$RELEASE_JSON" | head -c 300)"
  exit 1
fi

# Extract asset URL
ASSET_URL=$(echo "$RELEASE_JSON" \
  | grep -o '"url": *"[^"]*assets/[0-9]*"' | head -1 \
  | sed 's/.*"url": *"\(.*\)"/\1/')
if [[ -z "$ASSET_URL" ]]; then
  echo "ERROR: Release 'latest' exists but has no build asset attached."
  echo "Check: https://github.com/$REPO/releases/tag/latest"
  echo ""
  echo "If the asset is missing, re-run the workflow manually:"
  echo "  https://github.com/$REPO/actions/workflows/build-and-package.yml"
  echo "  → click 'Run workflow'"
  exit 1
fi

# Show what we're downloading
ASSET_NAME=$(echo "$RELEASE_JSON" | grep -o '"name": *"dwr-email-build.tar.gz"' | head -1 | sed 's/.*"name": *"\(.*\)"/\1/')
ASSET_SIZE=$(echo "$RELEASE_JSON" | grep -o '"size": *[0-9]*' | head -1 | sed 's/.*"size": *\(.*\)/\1/')
RELEASE_BODY=$(echo "$RELEASE_JSON" | grep -o '"body": *"[^"]*"' | head -1 | sed 's/.*"body": *"\(.*\)"/\1/')
echo "  Asset: $ASSET_NAME ($(( ASSET_SIZE / 1024 / 1024 )) MB)"
echo "  Build: $RELEASE_BODY"

mkdir -p "$NEW"
echo "  Downloading to: $NEW"
curl -sL -H "Authorization: Bearer $TOKEN" -H "Accept: application/octet-stream" \
  "$ASSET_URL" | tar -xz -C "$NEW"

# Verify the package actually extracted something
if [[ ! -f "$NEW/server.js" ]]; then
  echo "ERROR: Downloaded package is incomplete — server.js not found."
  echo "Contents of $NEW:"
  ls -la "$NEW" | head -20
  rm -rf "$NEW"
  exit 1
fi
echo "  Package extracted successfully."

# ─── 5. Link environment ──────────────────────────────────────────────────
echo "== Linking environment =="
ln -sf $APP_DIR/shared/.env "$NEW/.env"

# ─── 6. Create/update database tables ─────────────────────────────────────
echo "== Creating/updating database tables =="
cd "$NEW"
set -a; source $APP_DIR/shared/.env; set +a
npx --yes prisma@6.7.0 db push --schema prisma/schema.prisma --skip-generate

# ─── 7. Switch to new release and restart ─────────────────────────────────
echo "== Switching to new release and restarting =="
chown -R www-data:www-data "$NEW"
ln -sfn "$NEW" $APP_DIR/current
systemctl restart dwr-email
sleep 3
if systemctl is-active --quiet dwr-email; then
  echo ""
  echo "✓ DEPLOY SUCCESSFUL: $STAMP"
  echo "  Release: $NEW"
  echo "  Current: $(readlink $APP_DIR/current)"
  echo ""
  echo "  Test the upload diagnostics at:"
  echo "    https://dwremail.online/api/upload/diagnostics"
else
  echo "ERROR: dwr-email service failed to start after deploy."
  echo "Check logs with: journalctl -u dwr-email -n 50 --no-pager"
  echo "Rollback: ln -sfn $APP_DIR/releases/<previous-stamp> $APP_DIR/current && systemctl restart dwr-email"
  exit 1
fi

# ─── 8. Clean old releases ────────────────────────────────────────────────
echo "== Cleaning old releases (keeping newest 5) =="
ls -1dt $APP_DIR/releases/* | tail -n +6 | xargs -r rm -rf
echo "Done."
