import { NextResponse } from "next/server";
import { fetchExternalDiscoverRecipes } from "@/lib/external-recipes";
import { getAccessToken, getSupabaseAdmin, getSupabaseForRequest } from "@/lib/supabase/server";
import type { DiscoverRecipe, RecipeSummary } from "@/lib/types";

type RatingRow = {
  recipe_id: string;
  user_id: string;
  rating: number;
};

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function normalizeRecipeTitle(title: string) {
  return title
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueByTitle(recipes: DiscoverRecipe[]) {
  const seen = new Set<string>();
  return recipes.filter((recipe) => {
    const key = normalizeRecipeTitle(recipe.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function withRatings(recipes: RecipeSummary[], ratings: RatingRow[], userId: string): DiscoverRecipe[] {
  return recipes.map((recipe) => {
    const recipeRatings = ratings.filter((rating) => rating.recipe_id === recipe.id);
    const myRating = recipeRatings.find((rating) => rating.user_id === userId)?.rating ?? null;

    return {
      ...recipe,
      average_rating: Number(average(recipeRatings.map((rating) => rating.rating)).toFixed(1)),
      rating_count: recipeRatings.length,
      my_rating: myRating
    };
  });
}

export async function GET(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    if (!accessToken) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

    const userSupabase = getSupabaseForRequest(accessToken);
    const { data: userData, error: userError } = await userSupabase.auth.getUser(accessToken);
    if (userError || !userData.user) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 });

    let supabase = userSupabase;
    try {
      supabase = getSupabaseAdmin();
    } catch {
      supabase = userSupabase;
    }
    const [{ data: recipes, error: recipesError }, { data: ratings, error: ratingsError }] = await Promise.all([
      supabase
        .from("recipes")
        .select("id,title,category,servings,cooking_time,image_url,is_favorite,is_public,created_at")
        .order("created_at", { ascending: false })
        .limit(120),
      supabase.from("recipe_ratings").select("recipe_id,user_id,rating")
    ]);

    if (recipesError) throw recipesError;
    if (ratingsError) throw ratingsError;

    const ratedRecipes = uniqueByTitle(withRatings((recipes ?? []) as RecipeSummary[], (ratings ?? []) as RatingRow[], userData.user.id));
    const externalRecipes = await fetchExternalDiscoverRecipes(8).catch((error) => {
      console.warn("External recipes could not be loaded", error instanceof Error ? error.message : error);
      return [];
    });
    const random = shuffle(uniqueByTitle([...externalRecipes, ...ratedRecipes])).slice(0, 12);
    const leaderboard = [...ratedRecipes]
      .filter((recipe) => recipe.rating_count > 0)
      .sort((a, b) => b.average_rating - a.average_rating || b.rating_count - a.rating_count)
      .slice(0, 10);

    return NextResponse.json({ random, leaderboard });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Keşfet tarifleri yüklenemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
