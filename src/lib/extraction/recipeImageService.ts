import type { ExtractedFrame } from "@/lib/extraction/videoFrameExtractorService";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const IMAGE_FETCH_TIMEOUT_MS = 12000;

export async function resolveRecipeImageUrl(thumbnail: string, frames: ExtractedFrame[]) {
  const firstFrame = frames[0];
  if (firstFrame) return `data:${firstFrame.mimeType};base64,${firstFrame.data}`;

  return thumbnailToDataUrl(thumbnail);
}

export async function thumbnailToDataUrl(thumbnail: string) {
  if (!thumbnail) return "";
  if (thumbnail.startsWith("data:image/")) return thumbnail;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);
    const response = await fetch(thumbnail, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer: "https://www.instagram.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0 Safari/537.36"
      },
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store"
    });
    clearTimeout(timeout);

    if (!response.ok) return "";
    const mimeType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    if (!mimeType.startsWith("image/")) return "";

    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) return "";

    return `data:${mimeType};base64,${bytes.toString("base64")}`;
  } catch (error) {
    console.warn("Recipe thumbnail fetch skipped", error instanceof Error ? error.message : error);
    return "";
  }
}
