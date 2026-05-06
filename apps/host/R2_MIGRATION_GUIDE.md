# Migration to Cloudflare R2 - Summary

## What Changed

The image storage system has been migrated from **Supabase Storage** to **Cloudflare R2**. R2 is S3-compatible object storage with zero egress fees and generous free tier.

## Files Modified

### 1. New Files Created

- **`lib/r2-client.ts`** - R2 client configuration and utility functions
- **`.env.example`** - Template for environment variables

### 2. Updated API Routes

- **`app/api/events/upload/route.ts`** - Now uses R2 for event image uploads
- **`app/api/venues/upload/route.ts`** - Now uses R2 for venue image uploads

### 3. Updated Documentation

- **`EVENT_IMAGE_SETUP.md`** - Updated setup instructions for R2
- **`VENUE_IMAGE_SETUP.md`** - Updated setup instructions for R2

### 4. Dependencies

- Added `@aws-sdk/client-s3` package for R2 integration (S3-compatible API)

## What You Need to Do

### Step 1: Set Up Cloudflare R2

1. **Create an R2 Bucket:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to **R2** → **Create bucket**
   - Name it (e.g., `tulum-images`)

2. **Enable Public Access (Optional but recommended):**
   - Go to bucket **Settings** → **Public access**
   - Enable public access
   - Note the public URL (e.g., `https://pub-xxxxx.r2.dev`)
   - Or configure a custom domain for better branding

3. **Generate API Tokens:**
   - Click **Manage R2 API tokens**
   - Create a new token with **Edit** permissions
   - Save these values:
     - Access Key ID
     - Secret Access Key
     - Endpoint URL (e.g., `https://xxxxx.r2.cloudflarestorage.com`)

### Step 2: Update Environment Variables

Add these to your `.env.local` file:

```env
# Cloudflare R2 Storage
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id_here
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key_here
CLOUDFLARE_R2_ENDPOINT=https://xxxxx.r2.cloudflarestorage.com
CLOUDFLARE_R2_BUCKET_NAME=tulum-images
CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

**Important:** Keep your existing Supabase variables - they're still used for the database!

### Step 3: Restart Your Development Server

```bash
npm run dev
```

### Step 4: Test Image Uploads

Try uploading:

- A new event image
- A new venue image

Verify the images are:

- Stored in your R2 bucket
- Accessible via the public URL
- Displaying correctly in your app

## Benefits of R2 vs Supabase Storage

✅ **Free Tier:** 10 GB storage/month (vs Supabase's 1 GB)
✅ **Zero Egress Fees:** No charges for bandwidth/downloads
✅ **Global CDN:** Cloudflare's worldwide network
✅ **S3-Compatible:** Easy migration to/from AWS S3
✅ **Better Performance:** Optimized for object storage
✅ **Cost-Effective:** $0.015/GB beyond free tier

## Storage Structure

Images are organized as:

```
tulum-images/
├── event-images/
│   └── {userId}/
│       └── {venueId}/
│           └── {timestamp}-{random}.webp
└── venue-images/
    └── {userId}/
        ├── temp/
        │   └── {timestamp}-{random}.webp  (new venues)
        └── {venueId}/
            └── {timestamp}-{random}.webp  (existing venues)
```

## Existing Images

**Note:** Existing images in Supabase Storage will NOT be automatically migrated. You have two options:

1. **Keep both** - Leave old images in Supabase, new images go to R2
2. **Migrate manually** - Download from Supabase and re-upload to R2
3. **Fresh start** - Just use R2 going forward (simplest)

## Troubleshooting

### Images not uploading?

- Check R2 credentials in `.env.local`
- Verify bucket name matches
- Ensure endpoint URL is correct
- Check Cloudflare dashboard for bucket existence

### Images not displaying?

- Confirm public access is enabled on the bucket
- Verify the public URL is correct
- Check browser console for CORS errors
- Try accessing the image URL directly in a browser

### Need to configure CORS?

In your R2 bucket settings, add CORS rules if needed:

```json
[
  {
    "AllowedOrigins": ["https://yourdomain.com", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"]
  }
]
```

## Questions?

Refer to the updated documentation:

- [EVENT_IMAGE_SETUP.md](EVENT_IMAGE_SETUP.md)
- [VENUE_IMAGE_SETUP.md](VENUE_IMAGE_SETUP.md)
