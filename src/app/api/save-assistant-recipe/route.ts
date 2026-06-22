import { NextResponse } from "next/server";
import { z } from "zod";
import { saveRecipeNutrition } from "@/lib/save-recipe-nutrition";
import { getAccessToken, getSupabaseForRequest } from "@/lib/supabase/server";

const suggestionSchema = z.object({
  source_title: z.string().optional().default("Serra AI Asistani"),
  suggestion: z.object({
    title: z.string().min(1),
    reason: z.string().optional().default(""),
    time: z.string().optional().default(""),
    image_url: z.string().optional().default(""),
    ingredients: z.array(z.string()).min(1),
    steps: z.array(z.string()).min(1),
    tags: z.array(z.string()).optional().default([])
  })
});

export async function POST(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    if (!accessToken) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

    const body = suggestionSchema.parse(await request.json());
    const supabase = getSupabaseForRequest(accessToken);
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData.user) return NextResponse.json({ error: "Oturum dogrulanamadi." }, { status: 401 });

    await supabase.from("users").upsert({
      id: userData.user.id,
      email: userData.user.email ?? ""
    });

    const category = body.suggestion.tags[0] || "Asistan";
    const recipePayload = {
      user_id: userData.user.id,
      title: body.suggestion.title,
      source_url: null,
      image_url: body.suggestion.image_url || null,
      category,
      servings: "",
      cooking_time: body.suggestion.time,
      notes: body.suggestion.reason || `${body.source_title} onerisi.`,
      is_favorite: false,
      is_public: true
    };

    let { data: recipe, error: recipeError } = await supabase.from("recipes").insert(recipePayload).select("id").single();

    if (recipeError && recipeError.message.toLowerCase().includes("image_url")) {
      const { image_url, ...fallbackPayload } = recipePayload;
      void image_url;
      const fallbackResult = await supabase.from("recipes").insert(fallbackPayload).select("id").single();
      recipe = fallbackResult.data;
      recipeError = fallbackResult.error;
    }

    if (recipeError || !recipe) throw recipeError;

    const ingredients = body.suggestion.ingredients.map((ingredient) => ({
      recipe_id: recipe.id,
      name: ingredient,
      amount: "",
      unit: ""
    }));
    const steps = body.suggestion.steps.map((step, index) => ({
      recipe_id: recipe.id,
      step_order: index + 1,
      description: step
    }));

    const [{ error: ingredientsError }, { error: stepsError }] = await Promise.all([
      supabase.from("recipe_ingredients").insert(ingredients),
      supabase.from("recipe_steps").insert(steps)
    ]);

    if (ingredientsError || stepsError) throw ingredientsError ?? stepsError;

    await saveRecipeNutrition(supabase, {
      id: recipe.id,
      title: body.suggestion.title,
      category,
      servings: "",
      cooking_time: body.suggestion.time,
      notes: body.suggestion.reason,
      ingredients,
      steps
    });

    return NextResponse.json({ id: recipe.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tarif deftere eklenemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
