import { generateGeminiRecipe } from "@/lib/extraction/aiJson";
import type { DownloadedVideo, ExtractorRecipe, RecipeExtractionMetadata } from "@/lib/extraction/types";
import type { ExtractedFrame } from "@/lib/extraction/videoFrameExtractorService";

export async function recipeStepRepairService(input: {
  recipe: ExtractorRecipe;
  metadata: RecipeExtractionMetadata;
  video: DownloadedVideo | null;
  frames: ExtractedFrame[];
}) {
  const { recipe, metadata, video, frames } = input;
  const stepDescriptions = recipe.steps.map((step) => (typeof step === "string" ? step : step.description));
  const needsRepair =
    stepDescriptions.length < 2 ||
    stepDescriptions.some((description) => /yeterince net|bulunamadı|google|arama|e-?posta/i.test(description));

  if (!needsRepair || !video || !frames.length) return recipe;

  const repaired = await generateGeminiRecipe([
    {
      text: `Elimizdeki tarifin malzemeleri doğruya yakın, ama yapılış adımları eksik.
Bu video karelerine bakarak sadece görünen eylem sırasından uygulanabilir adımlar üret.
Malzemeleri mevcut tariften koru, ancak karelerde net görünen adetleri iyileştirebilirsin.

Mevcut tarif:
${JSON.stringify(recipe)}

Caption:
${[metadata.title, metadata.caption, metadata.transcript].filter(Boolean).join("\n").slice(0, 6000)}`
    },
    ...frames.map((frame) => ({
      inlineData: {
        mimeType: frame.mimeType,
        data: frame.data
      }
    }))
  ]);

  return {
    ...repaired,
    title: repaired.title || recipe.title,
    category: repaired.category || recipe.category,
    servings: repaired.servings || recipe.servings,
    cooking_time: repaired.cooking_time || recipe.cooking_time,
    ingredients: repaired.ingredients.length >= recipe.ingredients.length ? repaired.ingredients : recipe.ingredients,
    notes: repaired.notes || recipe.notes,
    source_summary: recipe.source_summary
  };
}
