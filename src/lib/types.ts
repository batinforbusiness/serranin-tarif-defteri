export type ExtractedRecipe = {
  title: string;
  category: string;
  servings: string;
  cooking_time: string;
  image_url?: string;
  nutrition?: RecipeNutrition;
  ingredients: Array<{
    name: string;
    amount: string;
    unit: string;
    source?: RecipeEvidenceSource;
    confidence?: number;
  }>;
  steps: Array<
    | string
    | {
        order: number;
        description: string;
        source?: RecipeEvidenceSource;
        confidence?: number;
      }
  >;
  notes: string;
  assumption_note?: string;
  overall_confidence?: number;
  source_summary?: {
    caption_used: boolean;
    video_used: boolean;
    transcript_used: boolean;
  };
};

export type RecipeEvidenceSource = "caption" | "video_text" | "visual" | "inferred";

export type RecipeNutrition = {
  total_calories: number;
  calories_per_serving: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number;
  nutrition_note: string;
};

export type RecipeSummary = {
  id: string;
  title: string;
  category: string | null;
  servings: string | null;
  cooking_time: string | null;
  image_url?: string | null;
  is_favorite: boolean;
  is_public?: boolean;
  created_at: string;
};

export type DiscoverRecipe = RecipeSummary & {
  average_rating: number;
  rating_count: number;
  my_rating: number | null;
  is_external?: boolean;
  source_name?: string;
  source_url?: string;
  external_recipe?: ExtractedRecipe;
};

export type RecipeDetail = RecipeSummary & {
  source_url: string | null;
  notes: string | null;
  recipe_nutrition?: RecipeNutritionRow[] | null;
  recipe_lighten_suggestions?: RecipeLightenSuggestionRow[] | null;
  recipe_ingredients: Array<{
    id: string;
    name: string;
    amount: string | null;
    unit: string | null;
  }>;
  recipe_steps: Array<{
    id: string;
    step_order: number;
    description: string;
  }>;
};

export type RecipeNutritionRow = RecipeNutrition & {
  id: string;
  recipe_id: string;
  created_at: string;
};

export type LightenRecipeResult = {
  suggestions: Array<{
    original: string;
    replacement: string;
    reason: string;
    calorie_impact: string;
  }>;
  lighter_version_steps: string[];
  summary: string;
};

export type RecipeLightenSuggestionRow = {
  id: string;
  recipe_id: string;
  result: LightenRecipeResult;
  created_at: string;
};

export type ShoppingItem = {
  id: string;
  recipe_id: string | null;
  name: string;
  amount: string | null;
  unit: string | null;
  is_checked: boolean;
  created_at: string;
};
