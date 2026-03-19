import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export type UploadFolder = "forkfeed/recipes" | "forkfeed/avatars";

/**
 * Upload a buffer to Cloudinary and return the secure URL.
 * Automatically resizes based on the target folder.
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  folder: UploadFolder,
): Promise<{ url: string; public_id: string }> {
  const transformation =
    folder === "forkfeed/avatars"
      ? [
          {
            width: 256,
            height: 256,
            crop: "fill" as const,
            gravity: "face" as const,
            quality: "auto" as const,
            fetch_format: "auto" as const,
          },
        ]
      : [
          {
            width: 1200,
            height: 800,
            crop: "limit" as const,
            quality: "auto" as const,
            fetch_format: "auto" as const,
          },
        ];

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: "image",
          transformation,
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("Cloudinary upload failed"));
          } else {
            resolve({ url: result.secure_url, public_id: result.public_id });
          }
        },
      )
      .end(buffer);
  });
}

/**
 * Delete an image from Cloudinary by its public_id.
 * Pass the full public_id (e.g. "forkfeed/recipes/abc123").
 * Safe to call even if the image doesn't exist.
 */
export async function deleteFromCloudinary(publicIdOrUrl: string): Promise<void> {
  // If a full Cloudinary URL was stored we extract the public_id
  const publicId = publicIdOrUrl.startsWith("http")
    ? extractPublicId(publicIdOrUrl)
    : publicIdOrUrl;

  if (!publicId) return;

  await cloudinary.uploader.destroy(publicId).catch(() => {
    // Non-critical – silently ignore if the image no longer exists
  });
}

function extractPublicId(url: string): string | null {
  // e.g. https://res.cloudinary.com/<cloud>/image/upload/v123456/forkfeed/recipes/abc123.webp
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
  return match ? match[1] : null;
}

export default cloudinary;
