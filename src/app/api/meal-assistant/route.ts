import { NextResponse } from "next/server";
import { generateMealAssistantResult, mealAssistantRequestSchema } from "@/lib/meal-assistant";
import { getAccessToken, getSupabaseForRequest } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    if (!accessToken) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

    const supabase = getSupabaseForRequest(accessToken);
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData.user) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 });

    const body = mealAssistantRequestSchema.parse(await request.json());
    const result = await generateMealAssistantResult(body);

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Yemek asistanı çalışamadı.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
