/**
 * Application environment configuration validated with Zod.
 */

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().default(3001),

  /** PostgreSQL connection URL. */
  DATABASE_URL: z.string().url(),

  /** Optional Redis URL (for future use). */
  REDIS_URL: z.string().url().optional(),

  /** Clerk JWKS URL, e.g. https://<clerk-domain>/.well-known/jwks.json */
  CLERK_JWKS_URL: z.string().url().optional(),

  /** Clerk JWT issuer (e.g. https://clerk.yourapp.com). */
  CLERK_ISSUER: z.string().url().optional(),

  /** Clerk webhook signing secret (required for POST /webhooks/clerk). */
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().optional(),

  /** Default tenant UUID for users created via webhook (must exist in tenants table). */
  CLERK_WEBHOOK_DEFAULT_TENANT_ID: z.string().uuid().optional(),

  /** Default role for users created via webhook. */
  CLERK_WEBHOOK_DEFAULT_ROLE: z.enum(['admin', 'manager', 'viewer']).default('viewer'),

  /** Default sector_access for users created via webhook. */
  CLERK_WEBHOOK_DEFAULT_SECTOR_ACCESS: z.enum(['all', 'none', 'financeiro', 'pcp', 'producao', 'vendas', 'projeto']).default('all'),

  /** Max upload size in bytes (default 10 MB). */
  UPLOAD_MAX_BYTES: z.coerce.number().default(10 * 1024 * 1024),

  /** Allowed CORS origin (comma-separated or *). */
  CORS_ORIGIN: z.string().default('*'),

  /** Directory or storage base path for uploaded files (local dev). */
  UPLOAD_STORAGE_PATH: z.string().default('./uploads'),

  /** Public API base URL for building fileUrl in responses (e.g. https://api.example.com). */
  API_PUBLIC_URL: z.string().url().optional(),

  /** AWS S3 (optional). When set, catalog PDFs are uploaded to S3 instead of local disk. */
  AWS_REGION: z.string().min(1).transform((s) => s.trim()).optional(),
  AWS_ACCESS_KEY_ID: z.string().min(1).transform((s) => s.trim()).optional(),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).transform((s) => s.trim()).optional(),
  /** S3 bucket name only (e.g. "my-catalog-bucket"), not a URL or s3:// URI. */
  S3_BUCKET: z.string().min(1).transform((s) => s.trim()).optional(),
  /** Prefix for object keys (e.g. "catalogos"). */
  S3_PREFIX: z.string().default('catalogos'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Returns true when S3 is configured (region, bucket, and credentials present).
 */
export function isS3Configured(env: Env): boolean {
  return Boolean(
    env.AWS_REGION &&
      env.S3_BUCKET &&
      env.AWS_ACCESS_KEY_ID &&
      env.AWS_SECRET_ACCESS_KEY
  );
}

/**
 * Loads and validates environment variables.
 * @returns Validated env object
 * @throws ZodError if validation fails
 */
export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment:', parsed.error.flatten());
    throw new Error('Invalid environment configuration');
  }
  return parsed.data;
}
