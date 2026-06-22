import { NextResponse } from "next/server";
import { z } from "zod";
import { lightenRecipe } from "@/lib/lighten-recipe";
import { lightenRecipeResultSchema } from "@/lib/validation";
import { getAccessToken, getSupabaseAdmin, getSupabaseForRequest } from "@/lib/supabase/server";

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
    const userSupabase = getSupabaseForRequest(accessToken);
    const { data: userData, error: userError } = await userSupabase.auth.getUser(accessToken);
    if (userError || !userData.user) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 });

    const supabase = getRecipeWriter(accessToken);

    const { data: existing } = await supabase
      .from("recipe_lighten_suggestions")
      .select("*")
      .eq("recipe_id", body.recipe_id)
      .maybeSingle();

    if (existing?.result) return NextResponse.json({ suggestion: existing });

    const { data: recipe, error } = await supabase
      .from("recipes")
      .select("id,user_id,is_public,title,category,servings,cooking_time,notes,recipe_ingredients(name,amount,unit),recipe_steps(step_order,description)")
      .eq("id", body.recipe_id)
      .single();

    if (error || !recipe) return NextResponse.json({ error: "Tarif bulunamadı." }, { status: 404 });
    if (recipe.user_id !== userData.user.id && recipe.is_public === false) {
      return NextResponse.json({ error: "Tarif bulunamadı." }, { status: 404 });
    }

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
      return NextResponse.json({ error: "Hafifletme önerisi kaydedilemedi. Supabase hafifletme tablosunu kontrol et." }, { status: 400 });
    }

    return NextResponse.json({ suggestion: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tarif hafifletilemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function getRecipeWriter(accessToken: string) {
  try {
    return getSupabaseAdmin();
  } catch {
    return getSupabaseForRequest(accessToken);
  }
}
