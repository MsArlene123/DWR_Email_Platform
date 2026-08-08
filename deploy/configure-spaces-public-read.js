#!/usr/bin/env node
/**
 * configure-spaces-public-read.js
 *
 * Applies a bucket policy to a DigitalOcean Space that allows anonymous
 * public reads of objects under the `public/` prefix, while keeping the
 * rest of the bucket private (file listing remains restricted).
 *
 * This is the Node.js version — no aws-cli required. Uses the @aws-sdk/client-s3
 * package that's already in the project's node_modules.
 *
 * This is required because DO Spaces created with "Restrict file listing"
 * silently ignore the per-object `ACL: 'public-read'` setting — uploads
 * succeed but the public URL returns 403.
 *
 * After running this script:
 *   - Objects at `public/uploads/...` are publicly readable by URL
 *   - Objects at `uploads/...` (private) remain private
 *   - The bucket LIST is still restricted (nobody can enumerate your files)
 *
 * Usage (run from the project root, or from /var/www/dwr-email/current):
 *   node deploy/configure-spaces-public-read.js
 *
 * Or with env vars (reads from .env automatically):
 *   AWS_BUCKET_NAME=dwr-email-assets \
 *   AWS_REGION=nyc3 \
 *   AWS_ACCESS_KEY_ID=... \
 *   AWS_SECRET_ACCESS_KEY=... \
 *   node deploy/configure-spaces-public-read.js
 *
 * Or it will prompt you for any missing values.
 */
const { S3Client, PutBucketPolicyCommand, GetBucketPolicyCommand } = require("@aws-sdk/client-s3");
const readline = require("readline");

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  // Read config from env or prompt
  const bucketName =
    process.env.AWS_BUCKET_NAME ||
    (await prompt("Space name (e.g. dwr-email-assets): "));
  const region =
    process.env.AWS_REGION ||
    (await prompt("Region (e.g. nyc3, sfo3, fra1, ams3, syd1, sgp1): "));
  const accessKeyId =
    process.env.AWS_ACCESS_KEY_ID ||
    (await prompt("Spaces Access Key ID: "));
  const secretAccessKey =
    process.env.AWS_SECRET_ACCESS_KEY ||
    (await prompt("Spaces Secret Access Key: "));

  if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
    console.error("ERROR: All four values are required.");
    process.exit(1);
  }

  const endpoint = `https://${region}.digitaloceanspaces.com`;

  console.log("");
  console.log("Configuring public-read policy on:");
  console.log(`  Space:    ${bucketName}`);
  console.log(`  Region:   ${region}`);
  console.log(`  Endpoint: ${endpoint}`);
  console.log("");

  // Build the S3 client
  const client = new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });

  // The bucket policy: allow anonymous GET on objects under public/*
  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "AllowPublicReadOfPublicPrefix",
        Effect: "Allow",
        Principal: "*",
        Action: "s3:GetObject",
        Resource: `arn:aws:s3:::${bucketName}/public/*`,
      },
    ],
  };

  console.log("Bucket policy to apply:");
  console.log(JSON.stringify(policy, null, 2));
  console.log("");

  // Apply the policy
  console.log("Applying bucket policy...");
  try {
    await client.send(
      new PutBucketPolicyCommand({
        Bucket: bucketName,
        Policy: JSON.stringify(policy),
      })
    );
    console.log(`✓ Bucket policy applied to ${bucketName}`);
  } catch (e) {
    console.error(`ERROR: Failed to apply bucket policy: ${e.message}`);
    if (e.name === "AccessDenied") {
      console.error(
        "  Your Spaces access key does not have permission to manage bucket policies."
      );
      console.error(
        "  Regenerate the key at https://cloud.digitalocean.com/spaces/settings with full access."
      );
    }
    process.exit(1);
  }

  // Verify by reading the policy back
  console.log("");
  console.log("Verification — current bucket policy:");
  try {
    const response = await client.send(
      new GetBucketPolicyCommand({ Bucket: bucketName })
    );
    console.log(JSON.stringify(JSON.parse(response.Policy), null, 2));
  } catch (e) {
    console.error(`  (Could not read policy back: ${e.message})`);
  }

  console.log("");
  console.log("Done. Objects under public/* are now publicly readable by URL.");
  console.log("");
  console.log("Next steps:");
  console.log("  1. Sign in at https://dwremail.online");
  console.log("  2. Go to Dashboard → Images");
  console.log("  3. Click 'Copy URL' on an uploaded image");
  console.log("  4. Paste the URL in a new browser tab — the image should load");
  console.log("");
  console.log("If you have already-uploaded images that returned 403, they should now");
  console.log("load without needing to re-upload them.");
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
