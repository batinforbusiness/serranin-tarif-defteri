import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccessToken, getSupabaseForRequest } from "@/lib/supabase/server";

const rateRecipeSchema = z.object({
  recipe_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5)
});

export async function POST(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    if (!accessToken) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

    const body = rateRecipeSchema.parse(await request.json());
    const userSupabase = getSupabaseForRequest(accessToken);
    const { data: userData, error: userError } = await userSupabase.auth.getUser(accessToken);
    if (userError || !userData.user) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 });

    const { data: recipe, error: recipeError } = await userSupabase
      .from("recipes")
      .select("id")
      .eq("id", body.recipe_id)
      .single();

    if (recipeError || !recipe) {
      return NextResponse.json({ error: "Bu tarif keşifte puanlanamaz." }, { status: 400 });
    }

    const { error } = await userSupabase.from("recipe_ratings").upsert(
      {
        recipe_id: body.recipe_id,
        user_id: userData.user.id,
        rating: body.rating
      },
      { onConflict: "recipe_id,user_id" }
    );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Puan kaydedilemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
