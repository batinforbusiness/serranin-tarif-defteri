import { NextResponse } from "next/server";
import { z } from "zod";
import { lightenRecipe } from "@/lib/lighten-recipe";
import { lightenRecipeResultSchema } from "@/lib/validation";
import { getAccessToken, getSupabaseForRequest } from "@/lib/supabase/server";

const lightenRequestSchema = z.object({
  recipe_id: z.string().uuid()
});

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    if (!accessToken) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

    const body = lightenRequestSchema.parse(await request.json());
    const supabase = getSupabaseForRequest(accessToken);

    const { data: existing } = await supabase
      .from("recipe_lighten_suggestions")
      .select("*")
      .eq("recipe_id", body.recipe_id)
      .maybeSingle();

    if (existing?.result) {
      return NextResponse.json({ suggestion: existing });
    }

    const { data: recipe, error } = await supabase
      .from("recipes")
      .select("id,title,category,servings,cooking_time,notes,recipe_ingredients(name,amount,unit),recipe_steps(step_order,description)")
      .eq("id", body.recipe_id)
      .single();

    if (error || !recipe) return NextResponse.json({ error: "Tarif bulunamadı." }, { status: 404 });

    const result = await lightenRecipe({
      title: recipe.title,
      category: recipe.category,
      servings: recipe.servings,
      cooking_time: recipe.cooking_time,
      notes: recipe.notes,
      ingredients: recipe.recipe_ingredients ?? [],
      steps: recipe.recipe_steps ?? []
    });

    const parsedResult = lightenRecipeResultSchema.parse(result);
    const { data, error: upsertError } = await supabase
      .from("recipe_lighten_suggestions")
      .upsert({
        recipe_id: recipe.id,
        result: parsedResult
      })
      .select("*")
      .single();

    if (upsertError || !data) {
      return NextResponse.json(
        { error: "Hafifletme önerisi kaydedilemedi. Supabase'de recipe-lighten-suggestions.sql dosyasını çalıştır." },
        { status: 400 }
      );
    }

    return NextResponse.json({ suggestion: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tarif hafifletilemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
