"use client";

import { useState } from "react";
import { KeyRound, Loader2, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

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
            Uygulamayi acmak icin proje klasorundeki <strong>.env.local</strong> dosyasina gerekli anahtarlari ekle.
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

  async function signIn() {
    const normalizedEmail = email.trim().toLocaleLowerCase("tr-TR");
    if (!normalizedEmail || password.length < 6) return;

    setIsSending(true);
    setMessage("");
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password
    });

    if (error) {
      setMessage("Giris yapilamadi. Sifreyi kontrol et veya yeni hesap olustur.");
    } else {
      setMessage("Giris yapildi.");
    }
    setIsSending(false);
  }

  async function signUp() {
    const normalizedEmail = email.trim().toLocaleLowerCase("tr-TR");
    if (!normalizedEmail || password.length < 6) return;

    setIsSending(true);
    setMessage("");
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      setMessage("Hesap olusturulamadi. Bu e-posta zaten kayitli olabilir.");
    } else {
      setMessage("Hesap olusturuldu. Eger onay maili isterse Supabase'te Confirm email ayarini kapat.");
    }
    setIsSending(false);
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-5">
      <div className="soft-card rounded-3xl p-6">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-100 text-rosewood">
          <KeyRound size={22} />
        </div>
        <h1 className="text-3xl font-semibold">Serra&apos;nın Tarif Defteri</h1>
        <p className="mt-3 text-sm leading-6 text-cocoa/70">
          iPhone ana ekran uygulamasinda kalmak icin e-posta ve sifreyle giris yap.
        </p>

        <input
          className="mt-6 w-full rounded-2xl border border-rosewood/15 bg-white px-4 py-4 outline-none ring-rosewood/20 focus:ring-4"
          placeholder="E-posta adresin"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <input
          className="mt-3 w-full rounded-2xl border border-rosewood/15 bg-white px-4 py-4 outline-none ring-rosewood/20 focus:ring-4"
          placeholder="Sifre"
          type="password"
          autoComplete="current-password"
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-rosewood px-5 py-4 font-semibold text-white disabled:opacity-50"
          disabled={!email || password.length < 6 || isSending}
          onClick={() => void signIn()}
        >
          {isSending ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
          Giris yap
        </button>
        <button
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-cream-100 px-5 py-3 text-sm font-black text-rosewood disabled:opacity-50"
          disabled={!email || password.length < 6 || isSending}
          onClick={() => void signUp()}
        >
          <UserPlus size={17} />
          Yeni hesap olustur
        </button>

        {message ? <p className="mt-4 rounded-2xl bg-cream-100 px-4 py-3 text-sm font-semibold text-cocoa/70">{message}</p> : null}
      </div>
    </main>
  );
}
