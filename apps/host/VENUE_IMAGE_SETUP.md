# Venue Image Storage Setup Guide

## Image Specifications

For optimal storage usage:

- **Size:** 200×200 pixels (square)
- **Format:** WebP (compressed)
- **Quality:** 80%
- **Estimated file size:** ~15-20 KB per image

## Setup Instructions

### 1. Run Database Migration

Run this SQL migration to update the venues table:

```bash
# Execute the migration file in your Supabase SQL Editor
sql/migrations/change_venues_picture_urls_to_picture_url.sql
```

This will:

- Clear existing `picture_urls` array data
- Add new `picture_url` column (optional text)
- Remove old `picture_urls` column
- Add index for better performance

### 2. Create Cloudflare R2 Bucket

1. Go to your [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** in the sidebar
3. Click **Create bucket**
4. Name it (e.g., `tulum-images`)
5. Click **Create bucket**

### 3. Set Up Public Access (Optional)

If you want direct public access to images:

1. Go to your bucket settings
2. Under **Settings** > **Public access**, enable public access
3. Note the public bucket URL (e.g., `https://pub-xxxxx.r2.dev`)

Or use a custom domain:

1. Go to **Settings** > **Domain**
2. Click **Connect domain**
3. Add your custom domain (e.g., `images.yourdomain.com`)

### 4. Generate R2 API Tokens

1. In R2, click **Manage R2 API tokens**
2. Click **Create API token**
3. Set permissions: **Edit** (allows read and write)
4. (Optional) Restrict to specific bucket
5. Click **Create API token**
6. **Save these values** (you won't see them again):
   - Access Key ID
   - Secret Access Key
   - Endpoint URL for S3 clients (e.g., `https://xxxxx.r2.cloudflarestorage.com`)

### 5. (Optional) Install Sharp for Server-Side Processing

For server-side image processing (better quality control):

```bash
npm install sharp
```

Then uncomment the sharp code in `/app/api/venues/upload/route.ts`

**Note:** Client-side processing will resize to 200×200 px automatically.

### 6. Environment Variables

Add these to your `.env.local`:

```env
# Cloudflare R2 Configuration
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key
CLOUDFLARE_R2_ENDPOINT=https://xxxxx.r2.cloudflarestorage.com
CLOUDFLARE_R2_BUCKET_NAME=tulum-images
CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
# Or use custom domain: https://images.yourdomain.com

# Keep Supabase for database (not storage)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Usage

### In Your Venue Creation Form

The image upload is now integrated into the `CreateVenueDialog` component:

```typescript
import { uploadVenueImage, validateVenueImage } from "@/lib/image-utils";

// Handle file selection
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate
  const validation = validateVenueImage(file);
  if (!validation.valid) {
    alert(validation.error);
    return;
  }

  try {
    setIsUploading(true);

    // Upload and get URL (automatically resized to 500x375 WebP)
    const { url, fileName } = await uploadVenueImage(file, venueId);

    // Save URL to form
    setValue("picture_url", url);
  } catch (error) {
    console.error("Failed to upload:", error);
  } finally {
    setIsUploading(false);
  }
};
```

### API Endpoints

- **Upload:** `POST /api/venues/upload`
- **Delete:** `DELETE /api/venues/upload?file={fileName}`

### Creating Venue with Image

```typescript
import * as api from "@/lib/api-client";

// Create venue with image
const created = await api.createVenue(venueData, imageFile);
```

## Storage Organization

Venue images are stored in this structure:

```
venue-images/
  ├── {userId}/
  │   └── temp/
  │       └── {timestamp}-{random}.webp  (for new venues)
  │   └── {venueId}/
  │       └── {timestamp}-{random}.webp  (for existing venues)
```

## Migration Notes

- The migration **clears all existing venue images** before changing the schema
- After running the migration, venues will need new images uploaded
- The `picture_urls` array field is completely replaced with `picture_url` single field
- Legacy `picture_urls` field is kept in TypeScript types for backward compatibility

## Features

✅ **Client-side processing** - Resize and compress before upload
✅ **WebP format** - 30-40% smaller than JPEG
✅ **Auto-resize** - Always 500×375 px
✅ **Quality control** - 80% quality
✅ **File validation** - Max 5MB, only images
✅ **Security** - User authorization checks
✅ **S3-compatible** - Easy migration to/from AWS S3
✅ **Global CDN** - Fast delivery via Cloudflare's network
✅ **Zero egress fees** - No charges for bandwidth

## Troubleshooting

### Images not uploading

1. Check that the R2 bucket exists and is accessible
2. Verify R2 API credentials are correct in environment variables
3. Ensure bucket name and endpoint URL match your configuration

### Images not displaying

1. Confirm public access is enabled on the bucket (if needed)
2. Check that the `picture_url` field is being saved correctly
3. Verify the public URL is accessible
4. Check CORS settings if accessing from browser

### Storage costs

- Cloudflare R2 offers 10 GB free storage per month
- Each venue image should be ~100 KB after processing
- No egress (bandwidth) fees
- Monitor usage in Cloudflare dashboard
