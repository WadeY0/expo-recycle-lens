import env from "@/config/env";

const CLOUDINARY_BASE_URL = env.APP_CLOUDINARY;

/**
 * Normalizes an image path from the backend into a full URL.
 * Handles:
 * 1. Full HTTP URLs (returns as-is)
 * 2. Local file URIs (returns as-is)
 * 3. Relative Cloudinary paths (prepends base URL)
 */
export const getImageUrl = (path: string | null | undefined) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  if (path.startsWith("file")) return path;
  if (path.startsWith("blob:")) return path;
  if (path.startsWith("data:")) return path;

  // Clean potential leading slash
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  return `${CLOUDINARY_BASE_URL}${cleanPath}`;
};
