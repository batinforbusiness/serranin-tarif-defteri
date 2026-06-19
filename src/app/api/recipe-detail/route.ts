import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccessToken, getSupabaseAdmin, getSupabaseForRequest } from "@/lib/supabase/server";

const querySchema = z.object({
  id: z.string().uuid()
});

export async function GET(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    if (!accessToken) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

    const userSupabase = getSupabaseForRequest(accessToken);
    const { data: userData, error: userError } = await userSupabase.auth.getUser(accessToken);
    if (userError || !userData.user) return NextResponse.json({ error: "Oturum dogrulanamadi." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const { id } = querySchema.parse({ id: searchParams.get("id") });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("recipes")
      .select("*,recipe_ingredients(id,name,amount,unit),recipe_steps(id,step_order,description),recipe_nutrition(*),recipe_lighten_suggestions(*)")
      .eq("id", id)
      .single();

    if (error || !data) return NextResponse.json({ error: "Tarif bulunamadi." }, { status: 404 });

    const isOwner = data.user_id === userData.user.id;
    const isPublic = data.is_public !== false;
    if (!isOwner && !isPublic) return NextResponse.json({ error: "Tarif bulunamadi." }, { status: 404 });

    return NextResponse.json({ recipe: data, can_edit: isOwner });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tarif yuklenemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
