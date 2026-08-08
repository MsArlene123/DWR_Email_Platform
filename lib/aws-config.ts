import { S3Client } from "@aws-sdk/client-s3";

/**
 * Returns the bucket config from environment.
 *
 * Required env vars:
 *   AWS_BUCKET_NAME              e.g. "dwr-email-assets"
 *   AWS_FOLDER_PREFIX            e.g. "" or "prod/" (optional, defaults to "")
 *   AWS_REGION                   e.g. "us-east-1" (also works for DO Spaces: "nyc3", "sfo3", etc.)
 *   AWS_ACCESS_KEY_ID            your AWS IAM key OR DigitalOcean Spaces access key
 *   AWS_SECRET_ACCESS_KEY        your AWS IAM secret OR DigitalOcean Spaces secret key
 *   AWS_ENDPOINT (optional)      Required for DigitalOcean Spaces
 *                                e.g. "https://nyc3.digitaloceanspaces.com"
 *                                Leave unset for native AWS S3.
 */
export function getBucketConfig() {
  const bucketName = process.env.AWS_BUCKET_NAME ?? "";
  const folderPrefix = process.env.AWS_FOLDER_PREFIX ?? "";
  if (!bucketName) {
    console.warn(
      "[aws-config] AWS_BUCKET_NAME is not set. Image uploads will fail."
    );
  }
  return { bucketName, folderPrefix };
}

/**
 * Builds an S3Client that works for BOTH AWS S3 and DigitalOcean Spaces.
 *
 * - If AWS_ENDPOINT is set (e.g. https://nyc3.digitaloceanspaces.com),
 *   we use it as the endpoint. This is the DigitalOcean Spaces case.
 * - Otherwise we let the AWS SDK use its default endpoint for the region.
 *
 * Credentials are read explicitly from env so the client works on a bare
 * DigitalOcean droplet that has no ~/.aws/credentials file and no IMDS.
 */
export function createS3Client() {
  const region = process.env.AWS_REGION || "us-east-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const endpoint = process.env.AWS_ENDPOINT; // optional, required for DO Spaces

  if (!accessKeyId || !secretAccessKey) {
    console.warn(
      "[aws-config] AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are not set. " +
        "Image uploads will fail. For DigitalOcean Spaces, generate keys at " +
        "https://cloud.digitalocean.com/spaces (Settings → Spaces Keys)."
    );
  }

  return new S3Client({
    region,
    endpoint: endpoint || undefined,
    forcePathStyle: !!endpoint, // DO Spaces works best with path-style addressing
    credentials: accessKeyId
      ? { accessKeyId, secretAccessKey: secretAccessKey || "" }
      : undefined,
  });
}
