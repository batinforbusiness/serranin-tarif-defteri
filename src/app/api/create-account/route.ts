import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const createAccountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function POST(request: Request) {
  try {
    const body = createAccountSchema.parse(await request.json());
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true
    });

    if (error) throw error;
    if (!data.user) throw new Error("Kullanici olusturulamadi.");

    await supabase.from("users").upsert({
      id: data.user.id,
      email: data.user.email ?? body.email
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hesap olusturulamadi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
