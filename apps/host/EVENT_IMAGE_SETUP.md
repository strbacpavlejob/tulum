# Event Image Storage Setup Guide

## Image Specifications

For optimal storage usage:

- **Size:** 500×375 pixels (landscape 4:3 aspect ratio)
- **Format:** WebP (compressed)
- **Quality:** 80%
- **Estimated file size:** ~100 KB per image

## Setup Instructions

### 1. Create Cloudflare R2 Bucket

1. Go to your [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** in the sidebar
3. Click **Create bucket**
4. Name it (e.g., `tulum-images`)
5. Click **Create bucket**

### 2. Set Up Public Access (Optional)

If you want direct public access to images:

1. Go to your bucket settings
2. Under **Settings** > **Public access**, enable public access
3. Note the public bucket URL (e.g., `https://pub-xxxxx.r2.dev`)

Or use a custom domain:

1. Go to **Settings** > **Domain**
2. Click **Connect domain**
3. Add your custom domain (e.g., `images.yourdomain.com`)

### 3. Generate R2 API Tokens

1. In R2, click **Manage R2 API tokens**
2. Click **Create API token**
3. Set permissions: **Edit** (allows read and write)
4. (Optional) Restrict to specific bucket
5. Click **Create API token**
6. **Save these values** (you won't see them again):
   - Access Key ID
   - Secret Access Key
   - Endpoint URL for S3 clients (e.g., `https://xxxxx.r2.cloudflarestorage.com`)

### 4. Add picture_url Column to Events Table

Run this in your Supabase SQL Editor:

```sql
-- Add picture_url column to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS picture_url TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_events_picture_url
ON events(picture_url)
WHERE picture_url IS NOT NULL;
```

### 5. (Optional) Install Sharp for Server-Side Processing

For server-side image processing (better quality control):

```bash
npm install sharp
```

Then uncomment the sharp code in `/app/api/events/upload/route.ts`

**Note:** Client-side processing will resize to 500×375 px automatically.

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

### In Your Event Creation Form

```typescript
import { uploadEventImage, validateEventImage } from "@/lib/image-utils";

// Handle file selection
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate
  const validation = validateEventImage(file);
  if (!validation.valid) {
    alert(validation.error);
    return;
  }

  try {
    setIsUploading(true);

    // Upload and get URL (automatically resized to 500x375 WebP)
    const { url, fileName } = await uploadEventImage(file, venueId);

    // Save URL to form
    setEventData({ ...eventData, picture_url: url });

    console.log("Image uploaded:", url);
  } catch (error) {
    console.error("Upload failed:", error);
    alert("Failed to upload image");
  } finally {
    setIsUploading(false);
  }
};
```

### Update Event Type

Add to your Event interface:

```typescript
export interface Event {
  id: number;
  venue_id: number;
  name: string;
  description?: string;
  picture_url?: string; // Add this
  start_time: string;
  end_time: string;
  status: string;
  // ... other fields
}
```

## Storage Calculation

With 2,000 events:

- 2,000 events × 100 KB = **200 MB**
- Plus venue images (1,000 × 100 KB) = **100 MB**
- Plus user photos (1,500 × 200 KB) = **293 MB**
- **Total: ~593 MB**

**Cloudflare R2 Pricing:**

- First 10 GB/month: **Free**
- Storage beyond 10 GB: $0.015/GB/month
- Class A operations (writes): $4.50 per million (1M/month free)
- Class B operations (reads): $0.36 per million (10M/month free)

## Features

✅ **Client-side processing** - Resize and compress before upload (saves bandwidth)
✅ **WebP format** - 30-40% smaller than JPEG
✅ **Auto-resize** - Always 500×375 px (perfect for 1/3 mobile screen)
✅ **Quality control** - 80% quality (good balance)
✅ **File validation** - Max 5MB, only images
✅ **Security** - User can only upload to their own venues
✅ **Organized storage** - Files stored as `event-images/userId/venueId/timestamp.webp`
✅ **S3-compatible** - Easy migration to/from AWS S3
✅ **Global CDN** - Fast delivery via Cloudflare's network
✅ **Zero egress fees** - No charges for bandwidth

## Troubleshooting

### Images not uploading

1. Check R2 bucket exists and is accessible
2. Verify R2 API credentials are correct
3. Check endpoint URL is correct
4. Ensure bucket name matches environment variable

### Images too large

- Client-side processing should resize to 500×375
- Install sharp for better compression
- Reduce quality setting (currently 80%)

### CORS errors

- In R2 bucket settings, configure CORS if accessing from browser
- Add your domain to allowed origins
