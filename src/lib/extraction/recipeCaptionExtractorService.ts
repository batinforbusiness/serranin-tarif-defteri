import { generateGeminiRecipe } from "@/lib/extraction/aiJson";
import type { ExtractorRecipe, RecipeExtractionMetadata } from "@/lib/extraction/types";

export async function recipeCaptionExtractorService(metadata: RecipeExtractionMetadata): Promise<ExtractorRecipe | null> {
  const content = [
    metadata.title ? `Başlık: ${metadata.title}` : "",
    metadata.caption ? `Açıklama/caption: ${metadata.caption}` : "",
    metadata.transcript ? `Transcript: ${metadata.transcript}` : "",
    metadata.rawText ? `Sayfa metni: ${metadata.rawText}` : ""
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 18000);

  if (content.length < 80) return null;

  return generateGeminiRecipe([
    {
      text: `Sadece metin kaynaklarını kullanarak tarif çıkar.
Ölçüler metinde açıkça yazıyorsa aynen koru. Metinde olmayan ölçüyü uydurma.
source alanı caption veya inferred olsun; transcript kullanıldıysa ilgili adım/malzeme için caption yazabilirsin.

Kaynak URL: ${metadata.url}

${content}`
    }
  ]);
}
