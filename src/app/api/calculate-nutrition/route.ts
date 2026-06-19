import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateRecipeNutrition } from "@/lib/nutrition";
import { getAccessToken, getSupabaseForRequest } from "@/lib/supabase/server";

const nutritionRequestSchema = z.object({
  recipe_id: z.string().uuid()
});

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    if (!accessToken) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

    const body = nutritionRequestSchema.parse(await request.json());
    const supabase = getSupabaseForRequest(accessToken);

    const { data: recipe, error } = await supabase
      .from("recipes")
      .select("id,title,category,servings,cooking_time,notes,recipe_ingredients(name,amount,unit),recipe_steps(step_order,description)")
      .eq("id", body.recipe_id)
      .single();

    if (error || !recipe) {
      return NextResponse.json({ error: "Tarif bulunamadı." }, { status: 404 });
    }

    const nutrition = await calculateRecipeNutrition({
      title: recipe.title,
      category: recipe.category,
      servings: recipe.servings,
      cooking_time: recipe.cooking_time,
      notes: recipe.notes,
      ingredients: recipe.recipe_ingredients ?? [],
      steps: recipe.recipe_steps ?? []
    });

    const { data, error: upsertError } = await supabase
      .from("recipe_nutrition")
      .upsert({
        recipe_id: recipe.id,
        total_calories: nutrition.total_calories,
        calories_per_serving: nutrition.calories_per_serving,
        protein_g: nutrition.protein_g,
        carbs_g: nutrition.carbs_g,
        fat_g: nutrition.fat_g,
        confidence: nutrition.confidence,
        nutrition_note: nutrition.nutrition_note
      })
      .select("*")
      .single();

    if (upsertError || !data) {
      return NextResponse.json(
        { error: "Kalori kaydedilemedi. Supabase'de recipe_nutrition SQL dosyasını çalıştır." },
        { status: 400 }
      );
    }

    return NextResponse.json({ nutrition: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kalori hesaplanamadı.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
