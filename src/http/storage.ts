/**
 * Local file storage for uploaded catalogos (dev); can be replaced by S3 later.
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const PDF_MIME = 'application/pdf';

/**
 * Saves an uploaded file to disk under basePath/tenantId and returns the relative path for DB.
 */
export async function saveUploadedFile(
  basePath: string,
  tenantId: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ filePath: string; fileName: string }> {
  if (mimeType !== PDF_MIME) {
    throw new Error('Only application/pdf is allowed');
  }

  const dir = path.join(basePath, tenantId);
  await fs.mkdir(dir, { recursive: true });

  const fileName = `${randomUUID()}.pdf`;
  const filePath = path.join(dir, fileName);
  await fs.writeFile(filePath, buffer);

  return {
    filePath,
    fileName,
  };
}

/**
 * Resolves absolute path for a stored file (file_path in DB may be absolute or relative).
 */
export function resolveFilePath(basePath: string, storedPath: string): string {
  if (path.isAbsolute(storedPath)) {
    return storedPath;
  }
  return path.join(basePath, storedPath);
}
