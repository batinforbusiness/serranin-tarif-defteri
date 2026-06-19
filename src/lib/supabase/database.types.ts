export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type RecipeRow = {
  id: string;
  user_id: string;
  title: string;
  source_url: string | null;
  image_url: string | null;
  category: string | null;
  servings: string | null;
  cooking_time: string | null;
  notes: string | null;
  is_favorite: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

type RecipeInsert = {
  id?: string;
  user_id: string;
  title: string;
  source_url?: string | null;
  image_url?: string | null;
  category?: string | null;
  servings?: string | null;
  cooking_time?: string | null;
  notes?: string | null;
  is_favorite?: boolean;
  is_public?: boolean;
  created_at?: string;
  updated_at?: string;
};

type IngredientRow = {
  id: string;
  recipe_id: string;
  name: string;
  amount: string | null;
  unit: string | null;
};

type StepRow = {
  id: string;
  recipe_id: string;
  step_order: number;
  description: string;
};

type ShoppingItemRow = {
  id: string;
  user_id: string;
  recipe_id: string | null;
  name: string;
  amount: string | null;
  unit: string | null;
  is_checked: boolean;
  created_at: string;
};

type RecipeNutritionRow = {
  id: string;
  recipe_id: string;
  total_calories: number;
  calories_per_serving: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number;
  nutrition_note: string | null;
  created_at: string;
};

type RecipeLightenSuggestionRow = {
  id: string;
  recipe_id: string;
  result: Json;
  created_at: string;
};

type RecipeRatingRow = {
  id: string;
  recipe_id: string;
  user_id: string;
  rating: number;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      users: {
        Row: { id: string; email: string; created_at: string };
        Insert: { id: string; email: string; created_at?: string };
        Update: { id?: string; email?: string; created_at?: string };
        Relationships: [];
      };
      recipes: {
        Row: RecipeRow;
        Insert: RecipeInsert;
        Update: Partial<Omit<RecipeRow, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "recipes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      recipe_ingredients: {
        Row: IngredientRow;
        Insert: Omit<IngredientRow, "id"> & { id?: string };
        Update: Partial<Omit<IngredientRow, "id">>;
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          }
        ];
      };
      recipe_steps: {
        Row: StepRow;
        Insert: Omit<StepRow, "id"> & { id?: string };
        Update: Partial<Omit<StepRow, "id">>;
        Relationships: [
          {
            foreignKeyName: "recipe_steps_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          }
        ];
      };
      recipe_nutrition: {
        Row: RecipeNutritionRow;
        Insert: Omit<RecipeNutritionRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<RecipeNutritionRow, "id" | "recipe_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "recipe_nutrition_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: true;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          }
        ];
      };
      recipe_lighten_suggestions: {
        Row: RecipeLightenSuggestionRow;
        Insert: Omit<RecipeLightenSuggestionRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<RecipeLightenSuggestionRow, "id" | "recipe_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "recipe_lighten_suggestions_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: true;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          }
        ];
      };
      recipe_ratings: {
        Row: RecipeRatingRow;
        Insert: Omit<RecipeRatingRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<RecipeRatingRow, "id" | "recipe_id" | "user_id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "recipe_ratings_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_ratings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      shopping_items: {
        Row: ShoppingItemRow;
        Insert: Omit<ShoppingItemRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<ShoppingItemRow, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "shopping_items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_items_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
