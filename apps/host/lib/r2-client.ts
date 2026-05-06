/**
 * Cloudflare R2 Storage Client
 * R2 is S3-compatible, so we use the AWS SDK
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Validate that all required R2 environment variables are set
 * Throws an error with helpful message if any are missing
 */
function validateR2Config(): void {
  const requiredVars = [
    'CLOUDFLARE_R2_ACCESS_KEY_ID',
    'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    'CLOUDFLARE_R2_ENDPOINT',
    'CLOUDFLARE_R2_BUCKET_NAME',
    'CLOUDFLARE_R2_PUBLIC_URL',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required Cloudflare R2 environment variables: ${missingVars.join(', ')}\n` +
      `Please add them to your .env.local file. See .env.example for reference.`
    );
  }
}

/**
 * Get or create the R2 S3 client (lazily initialized)
 */
let r2ClientInstance: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2ClientInstance) {
    validateR2Config();
    r2ClientInstance = new S3Client({
      region: "auto", // R2 uses 'auto' as the region
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return r2ClientInstance;
}

/**
 * Upload a file to R2
 * @param key - The file path/key in R2
 * @param buffer - The file buffer
 * @param contentType - MIME type of the file
 * @returns The public URL of the uploaded file
 */
export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  validateR2Config();
  
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  await client.send(command);

  // Return the public URL
  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
}

/**
 * Delete a file from R2
 * @param key - The file path/key in R2
 */
export async function deleteFromR2(key: string): Promise<void> {
  validateR2Config();
  
  console.log("[R2] Attempting to delete file:", key);
  
  const client = getR2Client();
  const command = new DeleteObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
    Key: key,
  });

  const result = await client.send(command);
  console.log("[R2] Delete command sent successfully for:", key);
  console.log("[R2] Delete result:", JSON.stringify(result, null, 2));
}

/**
 * Extract the R2 key from a full URL
 * @param url - The full R2 URL
 * @returns The key/path portion
 */
export function extractR2Key(url: string): string | null {
  try {
    console.log("[R2] Extracting key from URL:", url);
    
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
    if (!publicUrl) {
      console.warn("[R2] CLOUDFLARE_R2_PUBLIC_URL not set");
      return null;
    }
    
    const baseUrl = publicUrl.endsWith("/")
      ? publicUrl.slice(0, -1)
      : publicUrl;
    
    console.log("[R2] Base URL:", baseUrl);
    
    if (url.startsWith(baseUrl)) {
      const key = url.substring(baseUrl.length + 1);
      console.log("[R2] Extracted key:", key);
      return key;
    }
    
    // If it's already a key (no domain), return as-is
    if (!url.startsWith("http")) {
      console.log("[R2] URL is already a key:", url);
      return url;
    }
    
    console.warn("[R2] URL does not match base URL");
    return null;
  } catch (error) {
    console.error("[R2] Error extracting key:", error);
    return null;
  }
}
