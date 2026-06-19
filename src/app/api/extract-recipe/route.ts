import { NextResponse } from "next/server";
import { extractRecipeEngine } from "@/lib/extraction/extractRecipeEngine";
import { urlRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = urlRequestSchema.parse(await request.json());
    const run = await extractRecipeEngine(body.url);
    return NextResponse.json({ recipe: run.finalRecipe });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tarif çıkarılamadı.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
