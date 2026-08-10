/**
 * POST /api/upload/server-side
 *
 * Server-side image upload — the reliable path that bypasses all CORS issues.
 *
 * Why this exists:
 *   The original /api/upload/presigned flow has the browser PUT directly to
 *   DigitalOcean Spaces. That requires CORS to be configured on the Space,
 *   which DO does NOT enable by default. Without CORS, the browser blocks
 *   the PUT and uploads silently fail.
 *
 *   This route accepts the file via multipart/form-data, reads it into
 *   memory on the Next.js server, and uploads to Spaces using the AWS SDK.
 *   The browser only ever talks to your own origin, so no CORS is needed.
 *
 *   For logos and QR codes (typically <500KB), the overhead of routing
 *   through the server is negligible. For multi-GB video uploads you'd
 *   want the presigned path with CORS configured — but that's not the
 *   use case here.
 *
 * Request:
 *   multipart/form-data with fields:
 *     - file:      the image file (image/* content type, max 10 MB)
 *     - isPublic:  "true" or "false" (default "true")
 *
 * Response:
 *   200 OK  { fileName, cloud_storage_path, publicUrl, contentType, fileSize }
 *   400     { error: "..." }  — missing file, wrong type, too big
 *   401     { error: "Unauthorized" }
 *   500     { error: "..." }  — storage failure (with details)
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createS3Client, getBucketConfig } from "@/lib/aws-config";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getFileUrl } from "@/lib/s3";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  // 1. Auth
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse multipart form
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data. Make sure the request is sent as FormData, not JSON." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  const isPublicStr = (formData.get("isPublic") as string) || "true";
  const isPublic = isPublicStr !== "false";

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No file uploaded. Attach a file under the 'file' field." },
      { status: 400 }
    );
  }

  // 3. Validate file
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: `"${file.name}" is not an image (got ${file.type || "unknown type"}). Only image/* files are accepted.` },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB. Max is 10 MB.` },
      { status: 400 }
    );
  }

  // 4. Read file into memory
  let body: Uint8Array;
  try {
    const arrayBuffer = await file.arrayBuffer();
    body = new Uint8Array(arrayBuffer);
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to read file: ${(e as Error).message}` },
      { status: 500 }
    );
  }

  // 5. Validate bucket config
  const { bucketName, folderPrefix } = getBucketConfig();
  if (!bucketName) {
    return NextResponse.json(
      {
        error:
          "AWS_BUCKET_NAME is not set on the server. Visit /api/upload/diagnostics (signed in) for the full report.",
      },
      { status: 500 }
    );
  }

  // 6. Build object key
  const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const cloud_storage_path = isPublic
    ? `${folderPrefix}public/uploads/${Date.now()}-${sanitized}`
    : `${folderPrefix}uploads/${Date.now()}-${sanitized}`;

  // 7. Upload to S3 / Spaces
  let s3;
  try {
    s3 = createS3Client();
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to construct storage client: ${(e as Error).message}` },
      { status: 500 }
    );
  }

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: cloud_storage_path,
        Body: body,
        ContentType: file.type,
        ContentDisposition: isPublic ? "inline" : undefined,
        // Mark the object as publicly readable. Required on DO Spaces when
        // the Space itself has file listing restricted — the app sets
        // per-object public-read so individual images can be loaded by URL
        // without exposing the full bucket listing.
        ACL: isPublic ? "public-read" : undefined,
      })
    );
  } catch (e) {
    const err = e as Error & { name?: string; $metadata?: { httpStatusCode?: number } };
    const code = err.$metadata?.httpStatusCode ?? err.name ?? "Unknown";
    console.error("[upload/server-side] PutObject failed:", {
      code,
      name: err.name,
      message: err.message,
      bucket: bucketName,
      key: cloud_storage_path,
    });
    return NextResponse.json(
      {
        error: `Storage rejected upload (${code}): ${err.message}. ` +
          "Common causes: wrong region, wrong endpoint, wrong bucket name, " +
          "access key lacks permission on this bucket, or bucket doesn't exist. " +
          "Visit /api/upload/diagnostics for the full report.",
      },
      { status: 502 }
    );
  }

  // 8. Build the public URL
  let publicUrl: string | null = null;
  try {
    publicUrl = isPublic ? await getFileUrl(cloud_storage_path, true) : null;
  } catch {
    // non-fatal — the cloud_storage_path is what matters for the DB record
  }

  return NextResponse.json({
    fileName: file.name,
    cloud_storage_path,
    publicUrl,
    contentType: file.type,
    fileSize: file.size,
  });
}
