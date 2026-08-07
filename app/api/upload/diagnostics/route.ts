/**
 * GET /api/upload/diagnostics
 *
 * Runs four checks and returns a JSON report. Useful when image uploads
 * silently fail in production — visit this endpoint while signed in and
 * you'll see exactly which piece is misconfigured.
 *
 *   1. env      — are all required AWS/Spaces vars present?
 *   2. client   — can we construct an S3Client without throwing?
 *   3. bucket   — can we HEAD the bucket? (does it exist, are creds valid?)
 *   4. presign  — can we generate a presigned PUT URL?
 *
 * Never returns 500 — even on failure it returns 200 with the report so
 * you can load it in a browser. Sensitive values are masked.
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createS3Client, getBucketConfig } from "@/lib/aws-config";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { generatePresignedUploadUrl } from "@/lib/s3";

function mask(v: string | undefined) {
  if (!v) return "(not set)";
  if (v.length <= 8) return "***";
  return v.slice(0, 4) + "…" + v.slice(-4) + ` (len=${v.length})`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report: Record<string, { ok: boolean; detail: string }> = {
    env: { ok: false, detail: "" },
    client: { ok: false, detail: "" },
    bucket: { ok: false, detail: "" },
    presign: { ok: false, detail: "" },
  };

  // 1. env check
  const required = [
    "AWS_REGION",
    "AWS_BUCKET_NAME",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
  ];
  const optional = ["AWS_FOLDER_PREFIX", "AWS_ENDPOINT"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    report.env = {
      ok: false,
      detail: `Missing required env vars: ${missing.join(", ")}`,
    };
  } else {
    report.env = {
      ok: true,
      detail: `All required vars present. AWS_ENDPOINT=${
        process.env.AWS_ENDPOINT ? "(set → DigitalOcean Spaces mode)" : "(unset → AWS S3 mode)"
      }. Optional: ${optional
        .map((k) => `${k}=${mask(process.env[k])}`)
        .join(", ")}.`,
    };
  }

  // 2. client construction
  let client;
  try {
    client = createS3Client();
    report.client = { ok: true, detail: "S3Client constructed." };
  } catch (e) {
    report.client = {
      ok: false,
      detail: `Failed to construct S3Client: ${(e as Error).message}`,
    };
    return NextResponse.json({ report }, { status: 200 });
  }

  // 3. bucket HEAD
  const { bucketName } = getBucketConfig();
  if (!bucketName) {
    report.bucket = { ok: false, detail: "AWS_BUCKET_NAME is empty." };
  } else {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucketName }));
      report.bucket = {
        ok: true,
        detail: `Bucket "${bucketName}" is reachable and credentials are valid.`,
      };
    } catch (e) {
      const err = e as Error & { name?: string; $metadata?: { httpStatusCode?: number } };
      const code = err.$metadata?.httpStatusCode ?? err.name ?? "Unknown";
      report.bucket = {
        ok: false,
        detail: `HeadBucket failed (${code}): ${err.message}. ` +
          `Common causes: wrong region, wrong endpoint, wrong bucket name, ` +
          `or access key lacks permission on this bucket.`,
      };
    }
  }

  // 4. presign
  try {
    const { uploadUrl } = await generatePresignedUploadUrl(
      "diagnostics-test.txt",
      "text/plain",
      true
    );
    report.presign = {
      ok: true,
      detail: `Presigned URL generated (${uploadUrl.length} chars). Host: ${
        new URL(uploadUrl).host
      }`,
    };
  } catch (e) {
    report.presign = {
      ok: false,
      detail: `Presign failed: ${(e as Error).message}`,
    };
  }

  return NextResponse.json({ report }, { status: 200 });
}
