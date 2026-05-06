/**
 * Client-side image compression utility for event and venue images
 * - Event images: 500x375 px
 * - Venue images: 200x200 px
 */

export interface ImageProcessOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: "webp" | "jpeg" | "png";
}

const EVENT_IMAGE_OPTIONS: Required<ImageProcessOptions> = {
  maxWidth: 500,
  maxHeight: 375,
  quality: 0.8,
  outputFormat: "webp",
};

const VENUE_IMAGE_OPTIONS: Required<ImageProcessOptions> = {
  maxWidth: 200,
  maxHeight: 200,
  quality: 0.8,
  outputFormat: "webp",
};

/**
 * Process and compress an image file
 * @param file - The image file to process
 * @param options - Processing options
 * @returns Processed image as a Blob
 */
function processImage(
  file: File,
  defaultOptions: Required<ImageProcessOptions>,
  options: ImageProcessOptions = {}
): Promise<Blob> {
  const opts = { ...defaultOptions, ...options };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Create canvas for image processing
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        // Calculate dimensions maintaining aspect ratio
        let { width, height } = img;
        const aspectRatio = width / height;
        const targetRatio = opts.maxWidth / opts.maxHeight;

        if (aspectRatio > targetRatio) {
          // Image is wider - fit to width
          width = opts.maxWidth;
          height = width / aspectRatio;
        } else {
          // Image is taller - fit to height
          height = opts.maxHeight;
          width = height * aspectRatio;
        }

        // Set canvas size to target dimensions (will crop if needed)
        canvas.width = opts.maxWidth;
        canvas.height = opts.maxHeight;

        // Center the image on canvas (crop if needed)
        const offsetX = (opts.maxWidth - width) / 2;
        const offsetY = (opts.maxHeight - height) / 2;

        // Draw white background (for transparent images)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw image
        ctx.drawImage(img, offsetX, offsetY, width, height);

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to create blob"));
            }
          },
          `image/${opts.outputFormat}`,
          opts.quality
        );
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Process and compress an event image file (500x375 px)
 * @param file - The image file to process
 * @param options - Processing options
 * @returns Processed image as a Blob
 */
export async function processEventImage(
  file: File,
  options: ImageProcessOptions = {}
): Promise<Blob> {
  return processImage(file, EVENT_IMAGE_OPTIONS, options);
}

/**
 * Upload processed event image to the API
 * @param file - The image file to upload
 * @param venueId - The venue ID for the event
 * @returns Upload response with image URL
 */
export async function uploadEventImage(
  file: File,
  venueId: number
): Promise<{ url: string; fileName: string }> {
  // Process image on client side
  const processedBlob = await processEventImage(file);

  // Create form data
  const formData = new FormData();
  formData.append("file", processedBlob, "event-image.webp");
  formData.append("venue_id", venueId.toString());

  // Upload to API
  const response = await fetch("/api/events/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to upload image");
  }

  return response.json();
}

/**
 * Delete an event image
 * @param fileName - The file name/path to delete
 */
export async function deleteEventImage(fileName: string): Promise<void> {
  const response = await fetch(`/api/events/upload?file=${encodeURIComponent(fileName)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete image");
  }
}

/**
 * Validate image file before upload
 * @param file - The file to validate
 * @returns Validation result
 */
export function validateEventImage(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Please upload a JPEG, PNG, or WebP image",
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: "Image size must be less than 5MB",
    };
  }

  return { valid: true };
}

// ============================================================================
// VENUE IMAGE UTILITIES
// ============================================================================

/**
 * Process and compress a venue image file (200x200 px)
 * @param file - The image file to process
 * @param options - Processing options
 * @returns Processed image as a Blob
 */
export async function processVenueImage(
  file: File,
  options: ImageProcessOptions = {}
): Promise<Blob> {
  return processImage(file, VENUE_IMAGE_OPTIONS, options);
}

/**
 * Upload processed venue image to the API
 * @param file - The image file to upload
 * @param venueId - Optional venue ID (for existing venues)
 * @returns Upload response with image URL
 */
export async function uploadVenueImage(
  file: File,
  venueId?: number
): Promise<{ url: string; fileName: string }> {
  // Process image on client side
  const processedBlob = await processVenueImage(file);

  // Create form data
  const formData = new FormData();
  formData.append("file", processedBlob, "venue-image.webp");
  
  if (venueId) {
    formData.append("venue_id", venueId.toString());
  }

  // Upload to API
  const response = await fetch("/api/venues/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to upload image");
  }

  return response.json();
}

/**
 * Delete a venue image
 * @param fileName - The file name/path to delete
 */
export async function deleteVenueImage(fileName: string): Promise<void> {
  const response = await fetch(`/api/venues/upload?file=${encodeURIComponent(fileName)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete image");
  }
}

/**
 * Validate venue image file before upload
 * @param file - The file to validate
 * @returns Validation result
 */
export function validateVenueImage(file: File): { valid: boolean; error?: string } {
  // Use the same validation as event images
  return validateEventImage(file);
}
