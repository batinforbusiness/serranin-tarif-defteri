import { generateGeminiRecipe } from "@/lib/extraction/aiJson";
import type { DownloadedVideo, ExtractorRecipe, RecipeExtractionMetadata } from "@/lib/extraction/types";
import type { ExtractedFrame } from "@/lib/extraction/videoFrameExtractorService";

export async function recipeVideoExtractorService(
  metadata: RecipeExtractionMetadata,
  video: DownloadedVideo | null,
  frames: ExtractedFrame[] = []
): Promise<ExtractorRecipe | null> {
  if (!video) return null;

  if (frames.length) {
    return generateGeminiRecipe([
      {
        text: `Bu kareler aynı yemek videosundan sırasıyla alınmıştır: ${frames.map((frame) => `${frame.second}. saniye`).join(", ")}.
Kareleri zaman sırasıyla incele.
Görünen malzemeleri, özellikle sayılabilen adetleri çıkar: örneğin 2 dilim peynir, 1 köfte, 1 pirinç kağıdı.
Videoda net görülen eylemlerden uygulanabilir yapılış adımları yaz.
Emin olmadığın gram/ml gibi ölçüleri uydurma; ama net sayılabilen adetleri yaz.

Caption bağlamı:
${[metadata.title, metadata.caption, metadata.transcript].filter(Boolean).join("\n").slice(0, 6000)}`
      },
      ...frames.map((frame) => ({
        inlineData: {
          mimeType: frame.mimeType,
          data: frame.data
        }
      }))
    ]);
  }

  return generateGeminiRecipe([
    {
      text: `Bu video dosyasını yemek tarifi açısından kare kare analiz et.
Ekrandaki yazıları, görünen malzemeleri, sayılabilen adetleri ve hazırlama/pişirme adımlarını çıkar.
Videoda 2 dilim peynir, 1 yumurta, 3 parça gibi net sayılabilen malzemeler varsa amount/unit yaz.
Ölçü net görünmüyorsa amount ve unit boş kalsın.
Görselden anlaşılan bilgiler için source "visual", ekrandaki yazılar için "video_text" kullan.
Adımlar mutlaka videodaki eylem sırasından çıksın. Belirsiz teknik cümle veya "adım bulunamadı" yazma.

Caption bağlamı:
${[metadata.title, metadata.caption, metadata.transcript].filter(Boolean).join("\n").slice(0, 6000)}`
    },
    {
      inlineData: {
        mimeType: video.mimeType,
        data: video.bytes.toString("base64")
      }
    }
  ]);
}
