import { NextResponse } from "next/server";
import { storeRecipeImage } from "@/lib/recipe-image-storage";
import { getAccessToken, getSupabaseForRequest } from "@/lib/supabase/server";
import { saveRecipeSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
    }

    const body = saveRecipeSchema.parse(await request.json());
    const supabase = getSupabaseForRequest(accessToken);
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 });
    }

    const { error: profileError } = await supabase.from("users").upsert({
      id: userData.user.id,
      email: userData.user.email ?? ""
    });

    if (profileError) throw profileError;

    const recipePayload = {
        user_id: userData.user.id,
        title: body.recipe.title,
        source_url: body.source_url,
        image_url: body.recipe.image_url || null,
        category: body.recipe.category,
        servings: body.recipe.servings,
        cooking_time: body.recipe.cooking_time,
        notes: body.recipe.notes,
        is_favorite: false
    };

    let { data: recipe, error: recipeError } = await supabase
      .from("recipes")
      .insert(recipePayload)
      .select("id")
      .single();

    if (recipeError && recipeError.message.toLowerCase().includes("image_url")) {
      const { image_url, ...fallbackPayload } = recipePayload;
      void image_url;
      const fallbackResult = await supabase.from("recipes").insert(fallbackPayload).select("id").single();
      recipe = fallbackResult.data;
      recipeError = fallbackResult.error;
    }

    if (recipeError || !recipe) throw recipeError;

    const storedImageUrl = await storeRecipeImage({
      userId: userData.user.id,
      recipeId: recipe.id,
      imageUrl: body.recipe.image_url
    }).catch((error) => {
      console.warn("Recipe image could not be stored", error instanceof Error ? error.message : error);
      return "";
    });

    if (storedImageUrl) await supabase.from("recipes").update({ image_url: storedImageUrl }).eq("id", recipe.id);

    const ingredients = body.recipe.ingredients.map((ingredient) => ({
      recipe_id: recipe.id,
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit
    }));
    const steps = body.recipe.steps.map((step, index) => ({
      recipe_id: recipe.id,
      step_order: typeof step === "string" ? index + 1 : step.order,
      description: typeof step === "string" ? step : step.description
    }));

    const [{ error: ingredientsError }, { error: stepsError }] = await Promise.all([
      supabase.from("recipe_ingredients").insert(ingredients),
      supabase.from("recipe_steps").insert(steps)
    ]);

    if (ingredientsError || stepsError) throw ingredientsError ?? stepsError;

    if (body.recipe.nutrition) {
      const { error: nutritionError } = await supabase.from("recipe_nutrition").upsert({
        recipe_id: recipe.id,
        total_calories: body.recipe.nutrition.total_calories,
        calories_per_serving: body.recipe.nutrition.calories_per_serving,
        protein_g: body.recipe.nutrition.protein_g,
        carbs_g: body.recipe.nutrition.carbs_g,
        fat_g: body.recipe.nutrition.fat_g,
        confidence: body.recipe.nutrition.confidence,
        nutrition_note: body.recipe.nutrition.nutrition_note
      });

      if (nutritionError) {
        console.warn("Recipe nutrition could not be stored", nutritionError.message);
      }
    }

    return NextResponse.json({ id: recipe.id });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error && "message" in error
          ? String(error.message)
          : "Tarif kaydedilemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
