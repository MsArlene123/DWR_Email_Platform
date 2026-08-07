import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createS3Client, getBucketConfig } from "./aws-config";

/**
 * Generate a presigned PUT URL the browser can use to upload a file
 * directly to S3 / DigitalOcean Spaces. Valid for 1 hour.
 */
export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string,
  isPublic = false
) {
  const s3 = createS3Client();
  const { bucketName, folderPrefix } = getBucketConfig();

  if (!bucketName) {
    throw new Error("AWS_BUCKET_NAME is not configured");
  }

  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const cloud_storage_path = isPublic
    ? `${folderPrefix}public/uploads/${Date.now()}-${sanitized}`
    : `${folderPrefix}uploads/${Date.now()}-${sanitized}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ContentType: contentType,
    // For public images we want the file to display inline (logos, QR codes),
    // not download as an attachment. Use 'inline' for public, omit for private.
    ContentDisposition: isPublic ? "inline" : undefined,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  return { uploadUrl, cloud_storage_path };
}

/**
 * Returns a URL the browser can use to GET the file.
 *
 * - For public files, returns a permanent public URL.
 * - For private files, returns a presigned URL valid for 1 hour.
 *
 * Works with both AWS S3 and DigitalOcean Spaces by respecting the
 * AWS_ENDPOINT env var when present.
 */
export async function getFileUrl(
  cloud_storage_path: string,
  isPublic: boolean
) {
  const { bucketName } = getBucketConfig();
  const region = process.env.AWS_REGION || "us-east-1";
  const endpoint = process.env.AWS_ENDPOINT; // e.g. https://nyc3.digitaloceanspaces.com

  if (isPublic) {
    // DO Spaces:  https://<bucket>.<region>.cdn.digitaloceanspaces.com/<key>
    //             or https://<bucket>.<region>.digitaloceanspaces.com/<key>
    // AWS S3:     https://<bucket>.s3.<region>.amazonaws.com/<key>
    if (endpoint) {
      // DigitalOcean Spaces (or any S3-compatible with custom endpoint)
      // Strip the scheme for host building, then use subdomain form.
      const host = endpoint.replace(/^https?:\/\//, "");
      return `https://${bucketName}.${host}/${cloud_storage_path}`;
    }
    return `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path}`;
  }

  // Private file → presigned URL
  const s3 = createS3Client();
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ResponseContentDisposition: "attachment",
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

/**
 * Delete a file from S3 / Spaces.
 */
export async function deleteFile(cloud_storage_path: string) {
  const s3 = createS3Client();
  const { bucketName } = getBucketConfig();
  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: cloud_storage_path,
    })
  );
}
