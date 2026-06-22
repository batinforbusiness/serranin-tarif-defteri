import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccessToken, getSupabaseForRequest } from "@/lib/supabase/server";

const copyRecipeSchema = z.object({
  recipe_id: z.string().uuid()
});

export async function POST(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    if (!accessToken) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

    const body = copyRecipeSchema.parse(await request.json());
    const userSupabase = getSupabaseForRequest(accessToken);
    const { data: userData, error: userError } = await userSupabase.auth.getUser(accessToken);
    if (userError || !userData.user) return NextResponse.json({ error: "Oturum dogrulanamadi." }, { status: 401 });

    const { data: source, error: sourceError } = await userSupabase
      .from("recipes")
      .select("*,recipe_ingredients(name,amount,unit),recipe_steps(step_order,description)")
      .eq("id", body.recipe_id)
      .single();

    if (sourceError || !source || source.is_public === false) {
      return NextResponse.json({ error: "Kopyalanacak tarif bulunamadi." }, { status: 404 });
    }

    const { data: newRecipe, error: recipeError } = await userSupabase
      .from("recipes")
      .insert({
        user_id: userData.user.id,
        title: source.title,
        source_url: source.source_url,
        category: source.category,
        servings: source.servings,
        cooking_time: source.cooking_time,
        notes: source.notes,
        image_url: source.image_url,
        is_favorite: false,
        is_public: true
      })
      .select("id")
      .single();

    if (recipeError || !newRecipe) throw recipeError;

    const ingredients = (source.recipe_ingredients ?? []).map((ingredient: { name: string; amount: string | null; unit: string | null }) => ({
      recipe_id: newRecipe.id,
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit
    }));
    const steps = (source.recipe_steps ?? []).map((step: { step_order: number; description: string }) => ({
      recipe_id: newRecipe.id,
      step_order: step.step_order,
      description: step.description
    }));

    const [{ error: ingredientsError }, { error: stepsError }] = await Promise.all([
      ingredients.length ? userSupabase.from("recipe_ingredients").insert(ingredients) : Promise.resolve({ error: null }),
      steps.length ? userSupabase.from("recipe_steps").insert(steps) : Promise.resolve({ error: null })
    ]);

    if (ingredientsError || stepsError) throw ingredientsError ?? stepsError;

    return NextResponse.json({ id: newRecipe.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tarif deftere eklenemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
