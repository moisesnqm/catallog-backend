/**
 * S3 storage for catalog PDFs. Uploads buffer to S3 and returns the object URL.
 */

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

const PDF_CONTENT_TYPE = 'application/pdf';

export interface S3UploadConfig {
  region: string;
  bucket: string;
  prefix: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface UploadCatalogPdfResult {
  /** Public URL of the uploaded object. */
  fileUrl: string;
  /** S3 object key (for storing in file_path if desired). */
  fileKey: string;
  /** Suggested filename (uuid.pdf). */
  fileName: string;
}

/**
 * Builds the public URL for an S3 object (bucket with public read or virtual-hosted style).
 */
function buildPublicUrl(region: string, bucket: string, key: string): string {
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
}

/**
 * Uploads a catalog PDF buffer to S3 and returns the object URL and key.
 *
 * @param config - S3 and credentials config
 * @param tenantId - Tenant UUID for key prefix
 * @param body - PDF buffer
 * @returns Object URL, key, and suggested filename
 */
export async function uploadCatalogPdf(
  config: S3UploadConfig,
  tenantId: string,
  body: Buffer
): Promise<UploadCatalogPdfResult> {
  const client = new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  const fileName = `${randomUUID()}.pdf`;
  const key = [config.prefix, tenantId, fileName].filter(Boolean).join('/');

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: PDF_CONTENT_TYPE,
    })
  );

  const fileUrl = buildPublicUrl(config.region, config.bucket, key);

  return {
    fileUrl,
    fileKey: key,
    fileName,
  };
}
