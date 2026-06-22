import { extractedRecipeSchema } from "@/lib/validation";
import type { DiscoverRecipe, ExtractedRecipe } from "@/lib/types";

type MealDbRecipe = {
  idMeal: string;
  strMeal: string;
  strCategory: string | null;
  strInstructions: string | null;
  strMealThumb: string | null;
  strSource: string | null;
  strYoutube: string | null;
  [key: string]: string | null;
};

export type ExternalDiscoverRecipe = DiscoverRecipe & {
  is_external: true;
  source_name: string;
  source_url: string;
  external_recipe: ExtractedRecipe;
};

export async function fetchExternalDiscoverRecipes(count = 8): Promise<ExternalDiscoverRecipe[]> {
  const requests = Array.from({ length: Math.min(Math.max(count, 1), 10) }, () => fetchRandomMeal());
  const meals = (await Promise.allSettled(requests))
    .flatMap((result) => (result.status === "fulfilled" && result.value ? [result.value] : []));

  return uniqueMeals(meals).map((meal) => toExternalDiscoverRecipe(meal));
}

async function fetchRandomMeal() {
  const response = await fetch("https://www.themealdb.com/api/json/v1/1/random.php", {
    next: { revalidate: 900 }
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { meals?: MealDbRecipe[] | null };
  return payload.meals?.[0] ?? null;
}

function uniqueMeals(meals: MealDbRecipe[]) {
  const seen = new Set<string>();
  return meals.filter((meal) => {
    const key = normalize(meal.strMeal);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toExternalDiscoverRecipe(meal: MealDbRecipe): ExternalDiscoverRecipe {
  const ingredients = Array.from({ length: 20 }, (_, index) => {
    const number = index + 1;
    const name = (meal[`strIngredient${number}`] ?? "").trim();
    const measure = (meal[`strMeasure${number}`] ?? "").trim();
    if (!name) return null;

    const { amount, unit } = splitMeasure(measure);
    return {
      name,
      amount,
      unit,
      source: "caption" as const,
      confidence: 0.85
    };
  }).filter(Boolean) as ExtractedRecipe["ingredients"];

  const steps = splitInstructions(meal.strInstructions).map((description, index) => ({
    order: index + 1,
    description,
    source: "caption" as const,
    confidence: 0.8
  }));

  const recipe = extractedRecipeSchema.parse({
    title: meal.strMeal,
    category: meal.strCategory || "Dünya Mutfağı",
    servings: "",
    cooking_time: "",
    image_url: meal.strMealThumb || "",
    ingredients,
    steps: steps.length ? steps : [{ order: 1, description: "Malzemeleri hazırlayıp tarife uygun şekilde pişir.", source: "inferred", confidence: 0.25 }],
    notes: "İnternetten bulunan rastgele tarif önerisi.",
    assumption_note: "",
    overall_confidence: 0.75,
    source_summary: {
      caption_used: true,
      video_used: false,
      transcript_used: false
    }
  });

  const sourceUrl = meal.strSource || meal.strYoutube || "https://www.themealdb.com/";

  return {
    id: `external-${meal.idMeal}`,
    title: recipe.title,
    category: recipe.category,
    servings: recipe.servings,
    cooking_time: recipe.cooking_time,
    image_url: recipe.image_url,
    is_favorite: false,
    is_public: true,
    created_at: new Date().toISOString(),
    average_rating: 0,
    rating_count: 0,
    my_rating: null,
    is_external: true,
    source_name: "TheMealDB",
    source_url: sourceUrl,
    external_recipe: recipe
  };
}

function splitMeasure(measure: string) {
  if (!measure) return { amount: "", unit: "" };
  const match = measure.match(/^([\d.,/ ]+)(.*)$/);
  if (!match) return { amount: measure, unit: "" };
  return {
    amount: match[1].trim(),
    unit: match[2].trim()
  };
}

function splitInstructions(instructions: string | null) {
  return (instructions ?? "")
    .replace(/\r/g, "\n")
    .split(/\n+|(?<=[.!?])\s+(?=[A-ZÇĞİÖŞÜ])/)
    .map((step) => step.replace(/^\d+[\).]\s*/, "").trim())
    .filter((step) => step.length > 8)
    .slice(0, 10);
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
