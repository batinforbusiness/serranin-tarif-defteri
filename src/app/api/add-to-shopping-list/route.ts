import { NextResponse } from "next/server";
import { getAccessToken, getSupabaseForRequest } from "@/lib/supabase/server";
import { shoppingListSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
    }

    const body = shoppingListSchema.parse(await request.json());
    const supabase = getSupabaseForRequest(accessToken);
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 });
    }

    const { data: ingredients, error: ingredientsError } = await supabase
      .from("recipe_ingredients")
      .select("name,amount,unit,recipes!inner(user_id)")
      .eq("recipe_id", body.recipe_id)
      .eq("recipes.user_id", userData.user.id);

    if (ingredientsError) throw ingredientsError;
    if (!ingredients?.length) {
      return NextResponse.json({ error: "Malzeme bulunamadı." }, { status: 404 });
    }

    const rows = ingredients.map((ingredient) => ({
      user_id: userData.user.id,
      recipe_id: body.recipe_id,
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
      is_checked: false
    }));

    const { error: insertError } = await supabase.from("shopping_items").insert(rows);
    if (insertError) throw insertError;

    return NextResponse.json({ count: rows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Listeye eklenemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
