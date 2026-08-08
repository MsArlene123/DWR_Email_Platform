#!/usr/bin/env bash
#
# configure-spaces-public-read.sh
#
# Applies a bucket policy to a DigitalOcean Space that allows anonymous
# public reads of objects under the `public/` prefix, while keeping the
# rest of the bucket private (file listing remains restricted).
#
# This is required because DO Spaces created with "Restrict file listing"
# silently ignore the per-object `ACL: 'public-read'` setting — uploads
# succeed but the public URL returns 403.
#
# After running this script:
#   - Objects at `public/uploads/...` are publicly readable by URL
#   - Objects at `uploads/...` (private) remain private
#   - The bucket LIST is still restricted (nobody can enumerate your files)
#
# Requires: aws-cli installed.
#   On Ubuntu:  sudo apt-get install -y awscli
#
# Usage:
#   bash deploy/configure-spaces-public-read.sh
#
# Or with env vars:
#   AWS_BUCKET_NAME=dwr-email-assets
#   AWS_REGION=nyc3
#   AWS_ACCESS_KEY_ID=...
#   AWS_SECRET_ACCESS_KEY=...
#   bash deploy/configure-spaces-public-read.sh
#
set -euo pipefail

# ─── Collect inputs ────────────────────────────────────────────────────────
BUCKET="${AWS_BUCKET_NAME:-}"
REGION="${AWS_REGION:-}"
ACCESS_KEY="${AWS_ACCESS_KEY_ID:-}"
SECRET_KEY="${AWS_SECRET_ACCESS_KEY:-}"

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

ENDPOINT="https://${REGION}.digitaloceanspaces.com"

echo ""
echo "Configuring public-read policy on:"
echo "  Space:    $BUCKET"
echo "  Region:   $REGION"
echo "  Endpoint: $ENDPOINT"
echo ""

# ─── Check aws-cli is available ────────────────────────────────────────────
if ! command -v aws >/dev/null 2>&1; then
  echo "ERROR: aws-cli is not installed."
  echo "  On Ubuntu/Debian:  sudo apt-get install -y awscli"
  echo "  On macOS:          brew install awscli"
  exit 1
fi

# ─── Write the bucket policy to a temp file ────────────────────────────────
# This policy allows anonymous GET on any object under the public/ prefix.
# The bucket LIST action is NOT allowed, so the file listing stays private.
TMPFILE="$(mktemp /tmp/policy-XXXXXX.json)"
cat > "$TMPFILE" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPublicReadOfPublicPrefix",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${BUCKET}/public/*"
    }
  ]
}
EOF

echo "Bucket policy to apply:"
cat "$TMPFILE"
echo ""

# ─── Apply via aws-cli ─────────────────────────────────────────────────────
echo "Applying bucket policy..."
AWS_ACCESS_KEY_ID="$ACCESS_KEY" \
AWS_SECRET_ACCESS_KEY="$SECRET_KEY" \
AWS_DEFAULT_REGION="$REGION" \
aws s3api put-bucket-policy \
  --endpoint-url "$ENDPOINT" \
  --bucket "$BUCKET" \
  --policy "file://$TMPFILE"

rm -f "$TMPFILE"

echo ""
echo "✓ Bucket policy applied to $BUCKET"
echo ""
echo "Verification — current bucket policy:"
AWS_ACCESS_KEY_ID="$ACCESS_KEY" \
AWS_SECRET_ACCESS_KEY="$SECRET_KEY" \
AWS_DEFAULT_REGION="$REGION" \
aws s3api get-bucket-policy \
  --endpoint-url "$ENDPOINT" \
  --bucket "$BUCKET"
echo ""

# ─── Test by re-running the diagnostics ────────────────────────────────────
echo "Done. The bucket policy now allows anonymous GET on objects under public/*"
echo ""
echo "Next steps:"
echo "  1. Sign in at https://dwremail.online"
echo "  2. Go to Dashboard → Images"
echo "  3. Click 'Copy URL' on an uploaded image"
echo "  4. Paste the URL in a new browser tab — the image should load"
echo ""
echo "If you have already-uploaded images that returned 403, they should now"
echo "load without needing to re-upload them."
