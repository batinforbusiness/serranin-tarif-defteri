"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Mail } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type LoginStep = "email" | "code";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [step, setStep] = useState<LoginStep>("email");

  if (loading) {
    return (
      <main className="grid min-h-svh place-items-center px-4">
        <Loader2 className="animate-spin text-rosewood" size={28} />
      </main>
    );
  }

  if (!isConfigured) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-5">
        <div className="soft-card rounded-3xl p-6">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-100 text-rosewood">
            <KeyRound size={22} />
          </div>
          <h1 className="text-3xl font-semibold">Kurulum bekleniyor</h1>
          <p className="mt-3 text-sm leading-6 text-cocoa/70">
            Uygulamayı açmak için proje klasöründe <strong>.env.local</strong> dosyasına gerekli anahtarları ekle.
          </p>
          <div className="mt-5 rounded-2xl bg-white p-4 text-xs leading-6 text-cocoa/75">
            <p>NEXT_PUBLIC_SUPABASE_URL=...</p>
            <p>NEXT_PUBLIC_SUPABASE_ANON_KEY=...</p>
            <p>SUPABASE_SERVICE_ROLE_KEY=...</p>
            <p>GEMINI_API_KEY=...</p>
            <p>APIFY_TOKEN=...</p>
          </div>
        </div>
      </main>
    );
  }

  if (user) return <>{children}</>;

  async function sendCode() {
    const normalizedEmail = email.trim().toLocaleLowerCase("tr-TR");
    if (!normalizedEmail) return;

    setIsSending(true);
    setMessage("");
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      setMessage(error.message);
    } else {
      setEmail(normalizedEmail);
      setStep("code");
      setMessage("Maildeki 6 haneli kodu buraya yaz. Linke tıklamana gerek yok.");
    }
    setIsSending(false);
  }

  async function verifyCode() {
    const token = code.trim().replace(/\s/g, "");
    if (!email || token.length < 6) return;

    setIsSending(true);
    setMessage("");
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email"
    });

    if (error) {
      setMessage("Kod doğrulanamadı. Yeni kod isteyip tekrar dene.");
    } else {
      setMessage("Giriş yapıldı.");
    }
    setIsSending(false);
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-5">
      <div className="soft-card rounded-3xl p-6">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-100 text-rosewood">
          {step === "email" ? <Mail size={22} /> : <CheckCircle2 size={22} />}
        </div>
        <h1 className="text-3xl font-semibold">Serra&apos;nın Tarif Defteri</h1>
        <p className="mt-3 text-sm leading-6 text-cocoa/70">
          iPhone ana ekran uygulamasında kalmak için mail linkine tıklama; gelen kodu buraya yaz.
        </p>

        {step === "email" ? (
          <>
            <input
              className="mt-6 w-full rounded-2xl border border-rosewood/15 bg-white px-4 py-4 outline-none ring-rosewood/20 focus:ring-4"
              placeholder="E-posta adresin"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-rosewood px-5 py-4 font-semibold text-white disabled:opacity-50"
              disabled={!email || isSending}
              onClick={() => void sendCode()}
            >
              {isSending ? <Loader2 className="animate-spin" size={18} /> : <Mail size={18} />}
              Giriş kodu gönder
            </button>
          </>
        ) : (
          <>
            <input
              className="mt-6 w-full rounded-2xl border border-rosewood/15 bg-white px-4 py-4 text-center text-2xl font-black tracking-[0.35em] outline-none ring-rosewood/20 focus:ring-4"
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <button
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-rosewood px-5 py-4 font-semibold text-white disabled:opacity-50"
              disabled={code.length < 6 || isSending}
              onClick={() => void verifyCode()}
            >
              {isSending ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              Kodla giriş yap
            </button>
            <button
              className="mt-3 w-full rounded-2xl bg-cream-100 px-5 py-3 text-sm font-black text-rosewood"
              disabled={isSending}
              onClick={() => void sendCode()}
            >
              Yeni kod gönder
            </button>
            <button
              className="mt-2 w-full px-5 py-2 text-sm font-semibold text-cocoa/55"
              disabled={isSending}
              onClick={() => {
                setStep("email");
                setCode("");
                setMessage("");
              }}
            >
              E-postayı değiştir
            </button>
          </>
        )}

        {message ? <p className="mt-4 rounded-2xl bg-cream-100 px-4 py-3 text-sm font-semibold text-cocoa/70">{message}</p> : null}
      </div>
    </main>
  );
}
