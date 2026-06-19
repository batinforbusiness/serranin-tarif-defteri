import type { ExtractorRecipe, RecipeExtractionMetadata } from "@/lib/extraction/types";

const BAD_STEP_PATTERNS = [
  /bulunmamaktad[ıi]r/i,
  /google/i,
  /arama/i,
  /e-?posta/i,
  /sağlanan metin/i,
  /tarif adımları.*yok/i,
  /not available/i,
  /cannot determine/i,
  /insufficient/i
];

export function recipeQualityGateService(input: {
  recipe: ExtractorRecipe;
  metadata: RecipeExtractionMetadata;
  videoUsed: boolean;
}) {
  const { recipe, metadata, videoUsed } = input;
  const stepDescriptions = recipe.steps.map((step) => (typeof step === "string" ? step : step.description));
  const badStep = stepDescriptions.some((description) => BAD_STEP_PATTERNS.some((pattern) => pattern.test(description)));
  const meaningfulIngredients = recipe.ingredients.filter((ingredient) => ingredient.name.trim().length > 1);
  const hasAnyUsefulSource = Boolean(metadata.caption || metadata.transcript || metadata.videoUrl || videoUsed);
  const noUsableSteps = stepDescriptions.length < 2;

  if (badStep || noUsableSteps || !hasAnyUsefulSource) {
    throw new Error(
      "Tarifin yapılış adımları güvenilir çıkarılamadı. Chrome'da Instagram'a giriş yaptığından emin olup tekrar dene."
    );
  }

  if (meaningfulIngredients.length < 2) {
    throw new Error("Tarif malzemeleri güvenilir çıkarılamadı. Farklı bir link deneyebilirsin.");
  }

  return recipe;
}
