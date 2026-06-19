import { generateGeminiRecipe } from "@/lib/extraction/aiJson";
import type { ExtractorRecipe, RecipeExtractionMetadata } from "@/lib/extraction/types";

export async function recipeMergeService(input: {
  metadata: RecipeExtractionMetadata;
  captionRecipe: ExtractorRecipe | null;
  videoRecipe: ExtractorRecipe | null;
}) {
  const { metadata, captionRecipe, videoRecipe } = input;

  if (captionRecipe && !videoRecipe) {
    return {
      ...captionRecipe,
      source_summary: {
        caption_used: true,
        video_used: false,
        transcript_used: Boolean(metadata.transcript)
      }
    };
  }

  if (!captionRecipe && videoRecipe) {
    return {
      ...videoRecipe,
      source_summary: {
        caption_used: Boolean(metadata.caption),
        video_used: true,
        transcript_used: Boolean(metadata.transcript)
      }
    };
  }

  if (!captionRecipe && !videoRecipe) {
    throw new Error("Bu linkten tarif çıkarılamadı. Video veya açıklama verisi okunamadı.");
  }

  return generateGeminiRecipe([
    {
      text: `Caption tarifi ve video tarifini tek final tarife birleştir.
Öncelik sırası:
1. Açıklamada açıkça yazan ölçüler
2. Videoda ekranda görünen yazılar
3. Videoda net sayılabilen adetler: 2 dilim peynir, 1 adet yumurta gibi
4. Görselden anlaşılan malzemeler
5. Tahmini bilgiler

Ölçü net değilse uydurma; amount ve unit boş kalsın.
Aynı malzemeyi iki kez yazma.
Final yapılış adımlarında "bilgi bulunamadı", "Google araması" veya "e-posta" gibi metinler kesinlikle olmasın.
Caption adımları eksikse videoRecipe adımlarını kullan.
Eksik bilgiler için assumption_note içinde kısa kullanıcı notu üret.

Kaynak özet:
caption_used=${Boolean(metadata.caption)}
video_used=${Boolean(videoRecipe)}
transcript_used=${Boolean(metadata.transcript)}

Caption tarifi:
${JSON.stringify(captionRecipe)}

Video tarifi:
${JSON.stringify(videoRecipe)}`
    }
  ]);
}
