import { getSupabaseAdmin } from "@/lib/supabase/server";

const BUCKET = "recipe-images";

type StoredRecipeImageInput = {
  userId: string;
  recipeId: string;
  imageUrl?: string | null;
};

export async function storeRecipeImage(input: StoredRecipeImageInput) {
  const { userId, recipeId, imageUrl } = input;
  if (!imageUrl) return "";
  if (!imageUrl.startsWith("data:image/")) return imageUrl;

  const parsed = parseDataUrl(imageUrl);
  if (!parsed) return "";

  const supabase = getSupabaseAdmin();
  await ensureBucket();

  const extension = mimeToExtension(parsed.mimeType);
  const path = `${userId}/${recipeId}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, parsed.bytes, {
    contentType: parsed.mimeType,
    upsert: true
  });

  if (error) {
    console.warn("Recipe image storage upload skipped", error.message);
    return "";
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function ensureBucket() {
  const supabase = getSupabaseAdmin();
  const { data: bucket } = await supabase.storage.getBucket(BUCKET);

  if (bucket) {
    if (!bucket.public) {
      await supabase.storage.updateBucket(BUCKET, { public: true }).catch(() => undefined);
    }
    return;
  }

  await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 3 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"]
  });
}

function parseDataUrl(value: string) {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;

  return {
    mimeType: match[1],
    bytes: Buffer.from(match[2], "base64")
  };
}

function mimeToExtension(mimeType: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("avif")) return "avif";
  return "jpg";
}
