import { NextResponse } from "next/server";
import { z } from "zod";
import { storeRecipeImage } from "@/lib/recipe-image-storage";
import { metadataExtractorService } from "@/lib/extraction/metadataExtractorService";
import { resolveRecipeImageUrl } from "@/lib/extraction/recipeImageService";
import { videoDownloaderService } from "@/lib/extraction/videoDownloaderService";
import { videoFrameExtractorService } from "@/lib/extraction/videoFrameExtractorService";
import { getAccessToken, getSupabaseForRequest } from "@/lib/supabase/server";

const refreshImageSchema = z.object({
  recipe_id: z.string().uuid()
});

export async function POST(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    if (!accessToken) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

    const body = refreshImageSchema.parse(await request.json());
    const supabase = getSupabaseForRequest(accessToken);
    const { data: recipe, error: recipeError } = await supabase
      .from("recipes")
      .select("id,user_id,source_url")
      .eq("id", body.recipe_id)
      .single();

    if (recipeError || !recipe?.source_url) {
      return NextResponse.json({ error: "Bu tarifte kaynak link yok. Fotoğrafı otomatik bulamam." }, { status: 400 });
    }

    const metadata = await metadataExtractorService(recipe.source_url);
    let imageUrl = "";

    try {
      const video = await videoDownloaderService(metadata.videoUrl, metadata.url);
      const frames = video ? await videoFrameExtractorService(video) : [];
      imageUrl = await resolveRecipeImageUrl(metadata.thumbnail, frames);
    } catch (error) {
      console.warn("Recipe image frame extraction skipped", error instanceof Error ? error.message : error);
      imageUrl = await resolveRecipeImageUrl(metadata.thumbnail, []);
    }

    if (!imageUrl) {
      return NextResponse.json(
        {
          error: "Fotoğraf bulunamadı. Bu tarif için video kapağı ya da indirilebilir video alınamadı."
        },
        { status: 400 }
      );
    }

    const storedImageUrl = await storeRecipeImage({
      userId: recipe.user_id,
      recipeId: recipe.id,
      imageUrl
    }).catch((error) => {
      console.warn("Recipe image could not be stored", error instanceof Error ? error.message : error);
      return "";
    });
    const finalImageUrl = storedImageUrl || imageUrl;

    const { error: updateError } = await supabase.from("recipes").update({ image_url: finalImageUrl }).eq("id", recipe.id);
    if (updateError) {
      const message = updateError.message ?? "";
      if (message.toLowerCase().includes("image_url")) {
        return NextResponse.json(
          {
            error: "Fotoğraf kaydı için Supabase'de image_url alanı eksik görünüyor. SQL'i doğru projede tekrar çalıştır."
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: `Fotoğraf kaydedilemedi: ${message}` }, { status: 400 });
    }

    return NextResponse.json({ image_url: finalImageUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fotoğraf yenilenemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
