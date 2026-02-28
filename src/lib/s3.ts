/**
 * AWS S3 helper (stub — implement when AWS is configured).
 * Used for storing generated PDF invoices and manifest exports.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3Client: S3Client | null = null;

function getClient(): S3Client {
  if (!s3Client) {
    const region = process.env.AWS_REGION;
    if (!region) throw new Error("AWS_REGION is not configured.");
    s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3Client;
}

function getBucket(): string {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error("AWS_S3_BUCKET is not configured.");
  return bucket;
}

/**
 * Uploads a buffer to S3 and returns the object key.
 */
export async function uploadToS3(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
    ServerSideEncryption: "AES256",
  });
  await getClient().send(command);
  return params.key;
}

/**
 * Returns a pre-signed URL valid for the given number of seconds (default 5 min).
 */
export async function getPresignedUrl(
  key: string,
  expiresInSeconds = 300
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });
  return getSignedUrl(getClient(), command, { expiresIn: expiresInSeconds });
}

/**
 * Permanently deletes an object from S3.
 */
export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });
  await getClient().send(command);
}

/**
 * Returns the S3 key for an invoice PDF.
 * e.g. "invoices/2025/COSBT-2025-0001.pdf"
 */
export function invoiceS3Key(invoiceNumber: string): string {
  const year = invoiceNumber.split("-")[1] ?? "unknown";
  return `invoices/${year}/${invoiceNumber}.pdf`;
}
