import type { ExtractorRecipe } from "@/lib/extraction/types";

export function recipeConfidenceService(recipe: ExtractorRecipe): ExtractorRecipe {
  const ingredientScores = recipe.ingredients.map((ingredient) => ingredient.confidence ?? 0.6);
  const stepScores = recipe.steps.map((step) => (typeof step === "string" ? 0.7 : step.confidence ?? 0.6));
  const scores = [...ingredientScores, ...stepScores];
  const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0.5;
  const missingAmounts = recipe.ingredients.filter((ingredient) => !ingredient.amount && !ingredient.unit).length;
  const missingPenalty = recipe.ingredients.length ? Math.min(0.18, (missingAmounts / recipe.ingredients.length) * 0.18) : 0;
  const overall = Math.max(0, Math.min(1, Number((average - missingPenalty).toFixed(2))));

  return {
    ...recipe,
    overall_confidence: recipe.overall_confidence ? Math.min(recipe.overall_confidence, overall) : overall,
    assumption_note:
      recipe.assumption_note ||
      (missingAmounts ? "Bazı ölçüler videoda veya açıklamada net görünmediği için boş bırakıldı." : "")
  };
}
