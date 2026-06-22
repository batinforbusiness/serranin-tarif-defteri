import { NextResponse } from "next/server";
import { extractRecipeEngine } from "@/lib/extraction/extractRecipeEngine";
import { calculateRecipeNutrition } from "@/lib/nutrition";
import { urlRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = urlRequestSchema.parse(await request.json());
    const run = await extractRecipeEngine(body.url);
    const nutrition = await calculateRecipeNutrition({
      title: run.finalRecipe.title,
      category: run.finalRecipe.category,
      servings: run.finalRecipe.servings,
      cooking_time: run.finalRecipe.cooking_time,
      notes: run.finalRecipe.notes,
      ingredients: run.finalRecipe.ingredients,
      steps: run.finalRecipe.steps.map((step, index) =>
        typeof step === "string"
          ? { step_order: index + 1, description: step }
          : { step_order: step.order, description: step.description }
      )
    }).catch((error) => {
      console.warn("Nutrition could not be calculated during extraction", error instanceof Error ? error.message : error);
      return null;
    });

    return NextResponse.json({
      recipe: nutrition ? { ...run.finalRecipe, nutrition } : run.finalRecipe
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tarif çıkarılamadı.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
