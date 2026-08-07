#!/usr/bin/env bash
#
# configure-spaces-cors.sh
#
# Configures CORS on a DigitalOcean Space so the browser can PUT files
# directly via presigned URLs. This is OPTIONAL — the app's primary
# upload path is /api/upload/server-side which goes through your own
# Next.js server and never triggers CORS. You only need this script if
# you want to switch back to the direct-to-Space presigned-URL flow.
#
# Requires: aws-cli (or awscli-local) installed.
#   On Ubuntu:  apt-get install -y awscli
#
# Usage:
#   bash deploy/configure-spaces-cors.sh
#
# The script will prompt for your Space name, region, and access keys.
# Or you can set them as env vars first:
#   AWS_BUCKET_NAME=dwr-email-assets
#   AWS_REGION=nyc3
#   AWS_ACCESS_KEY_ID=...
#   AWS_SECRET_ACCESS_KEY=...
#   APP_ORIGIN=https://dwremail.online
#   bash deploy/configure-spaces-cors.sh
#
set -euo pipefail

# ─── Collect inputs ────────────────────────────────────────────────────────
BUCKET="${AWS_BUCKET_NAME:-}"
REGION="${AWS_REGION:-}"
ACCESS_KEY="${AWS_ACCESS_KEY_ID:-}"
SECRET_KEY="${AWS_SECRET_ACCESS_KEY:-}"
APP_ORIGIN="${APP_ORIGIN:-}"

if [[ -z "$BUCKET" ]]; then
  read -rp "Space name (e.g. dwr-email-assets): " BUCKET
fi
if [[ -z "$REGION" ]]; then
  read -rp "Region (e.g. nyc3, sfo3, fra1, ams3, syd1, sgp1): " REGION
fi
if [[ -z "$ACCESS_KEY" ]]; then
  read -rp "Spaces Access Key ID: " ACCESS_KEY
fi
if [[ -z "$SECRET_KEY" ]]; then
  read -rsp "Spaces Secret Access Key: " SECRET_KEY
  echo
fi
if [[ -z "$APP_ORIGIN" ]]; then
  read -rp "App origin URL (e.g. https://dwremail.online): " APP_ORIGIN
fi

ENDPOINT="https://${REGION}.digitaloceanspaces.com"

echo ""
echo "Configuring CORS on:"
echo "  Space:    $BUCKET"
echo "  Region:   $REGION"
echo "  Endpoint: $ENDPOINT"
echo "  Origin:   $APP_ORIGIN"
echo ""

# ─── Check aws-cli is available ────────────────────────────────────────────
if ! command -v aws >/dev/null 2>&1; then
  echo "ERROR: aws-cli is not installed."
  echo "  On Ubuntu/Debian:  sudo apt-get install -y awscli"
  echo "  On macOS:          brew install awscli"
  exit 1
fi

# ─── Write the CORS config to a temp file ──────────────────────────────────
# This allows:
#   - GET from any origin (so images can be loaded in email clients)
#   - PUT, POST, HEAD from your app origin only (browser uploads)
#   - All standard headers
TMPFILE="$(mktemp /tmp/cors-XXXXXX.json)"
cat > "$TMPFILE" <<EOF
{
  "CORSRules": [
    {
      "AllowedOrigins": ["${APP_ORIGIN}"],
      "AllowedMethods": ["PUT", "POST", "GET", "HEAD", "DELETE"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "x-amz-request-id"],
      "MaxAgeSeconds": 3600
    },
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

echo "CORS configuration to apply:"
cat "$TMPFILE"
echo ""

# ─── Apply via aws-cli ─────────────────────────────────────────────────────
echo "Applying CORS configuration..."
AWS_ACCESS_KEY_ID="$ACCESS_KEY" \
AWS_SECRET_ACCESS_KEY="$SECRET_KEY" \
AWS_DEFAULT_REGION="$REGION" \
aws s3api put-bucket-cors \
  --endpoint-url "$ENDPOINT" \
  --bucket "$BUCKET" \
  --cors-configuration "file://$TMPFILE"

rm -f "$TMPFILE"

echo ""
echo "✓ CORS configured on $BUCKET"
echo ""
echo "Verification:"
AWS_ACCESS_KEY_ID="$ACCESS_KEY" \
AWS_SECRET_ACCESS_KEY="$SECRET_KEY" \
AWS_DEFAULT_REGION="$REGION" \
aws s3api get-bucket-cors \
  --endpoint-url "$ENDPOINT" \
  --bucket "$BUCKET"
echo ""
echo "Done. Browser-based direct uploads to this Space from $APP_ORIGIN will now work."
