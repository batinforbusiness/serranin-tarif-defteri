import { calculateRecipeNutrition } from "@/lib/nutrition";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type SupabaseLike = {
  from: (table: string) => {
    upsert: (payload: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>;
  };
};

type SavedNutritionRecipe = {
  id: string;
  title: string;
  category?: string | null;
  servings?: string | null;
  cooking_time?: string | null;
  notes?: string | null;
  ingredients: Array<{
    name: string;
    amount?: string | null;
    unit?: string | null;
  }>;
  steps?: Array<{
    step_order?: number | null;
    description: string;
  }>;
  nutrition?: {
    total_calories: number;
    calories_per_serving: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    confidence: number;
    nutrition_note: string;
  };
};

export async function saveRecipeNutrition(supabase: SupabaseLike, recipe: SavedNutritionRecipe) {
  try {
    const writer = getNutritionWriter(supabase);
    const nutrition =
      recipe.nutrition ??
      (await calculateRecipeNutrition({
        title: recipe.title,
        category: recipe.category,
        servings: recipe.servings,
        cooking_time: recipe.cooking_time,
        notes: recipe.notes,
        ingredients: recipe.ingredients,
        steps: recipe.steps
      }));

    const { error } = await writer.from("recipe_nutrition").upsert({
      recipe_id: recipe.id,
      total_calories: nutrition.total_calories,
      calories_per_serving: nutrition.calories_per_serving,
      protein_g: nutrition.protein_g,
      carbs_g: nutrition.carbs_g,
      fat_g: nutrition.fat_g,
      confidence: nutrition.confidence,
      nutrition_note: nutrition.nutrition_note
    });

    if (error) console.warn("Recipe nutrition could not be stored", error.message);
  } catch (error) {
    console.warn("Recipe nutrition could not be calculated", error instanceof Error ? error.message : error);
  }
}

function getNutritionWriter(fallback: SupabaseLike): SupabaseLike {
  try {
    return getSupabaseAdmin() as unknown as SupabaseLike;
  } catch {
    return fallback;
  }
}
