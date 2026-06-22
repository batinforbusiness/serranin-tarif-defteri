import type { RecipeDetail } from "@/lib/types";

export type SerraScore = {
  total: number;
  practicality: number;
  lightness: number;
  clarity: number;
  charm: number;
  label: string;
  note: string;
};

export function calculateSerraScore(recipe: RecipeDetail): SerraScore {
  const ingredientCount = recipe.recipe_ingredients.length;
  const stepCount = recipe.recipe_steps.length;
  const hasTime = Boolean(recipe.cooking_time);
  const hasServings = Boolean(recipe.servings);
  const hasImage = Boolean(recipe.image_url);
  const nutrition = Array.isArray(recipe.recipe_nutrition)
    ? recipe.recipe_nutrition[0]
    : recipe.recipe_nutrition || null;

  const practicality = clamp(100 - Math.max(0, ingredientCount - 7) * 4 - Math.max(0, stepCount - 6) * 5 + (hasTime ? 8 : 0));
  const lightness = nutrition?.calories_per_serving
    ? clamp(110 - Math.round(nutrition.calories_per_serving / 12))
    : ingredientCount <= 8
      ? 78
      : 66;
  const clarity = clamp(58 + Math.min(stepCount, 8) * 4 + (hasServings ? 8 : 0) + (hasTime ? 8 : 0));
  const charm = clamp(62 + (hasImage ? 12 : 0) + (recipe.notes ? 7 : 0) + Math.min(ingredientCount, 10));
  const total = Math.round(practicality * 0.34 + lightness * 0.22 + clarity * 0.24 + charm * 0.2);

  return {
    total,
    practicality,
    lightness,
    clarity,
    charm,
    label: total >= 86 ? "Defter yıldızı" : total >= 74 ? "Çok iyi fikir" : total >= 62 ? "Güzel denenir" : "Biraz düzen ister",
    note:
      total >= 86
        ? "Bu tarif hem uygulanabilir hem de kaydetmeye değer görünüyor."
        : total >= 74
          ? "Tarif güçlü, küçük dokunuşlarla daha da parlayabilir."
          : "Tarifi daha net ölçüler ve kısa adımlarla güçlendirebiliriz."
  };
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
