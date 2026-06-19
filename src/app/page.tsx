"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart, Loader2, WandSparkles } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { RecipeCard } from "@/components/recipe-card";
import { SafeImage } from "@/components/safe-image";
import { PREFERENCES_EVENT, VEGAN_STORAGE_KEY } from "@/components/theme-client";
import { useAuth } from "@/components/auth-provider";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { ExtractedRecipe, RecipeSummary } from "@/lib/types";
import { isLikelyVeganRecipe, type VeganCheckRecipe } from "@/lib/vegan";

const LOADING_STEPS = [
  "Videoyu izliyorum...",
  "Malzemeleri seçiyorum...",
  "Ölçüleri kontrol ediyorum...",
  "Yapılışı deftere yazıyorum...",
  "Tarif kartını hazırlıyorum..."
];

export default function HomePage() {
  const { session } = useAuth();
  const [url, setUrl] = useState("");
  const [extracted, setExtracted] = useState<ExtractedRecipe | null>(null);
  const [recent, setRecent] = useState<RecipeSummary[]>([]);
  const [status, setStatus] = useState<"idle" | "extracting" | "saving">("idle");
  const [error, setError] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [veganMode, setVeganMode] = useState(false);

  const isBusy = status !== "idle";
  const canExtract = useMemo(() => url.trim().startsWith("http") && !isBusy, [isBusy, url]);

  useEffect(() => {
    if (!session) return;

    const loadRecent = async () => {
      const supabase = getBrowserSupabase();
      const { data } = await supabase
        .from("recipes")
        .select("*,recipe_ingredients(name)")
        .order("created_at", { ascending: false })
        .limit(12);
      const recipes = (data ?? []) as Array<RecipeSummary & VeganCheckRecipe>;
      setRecent((veganMode ? recipes.filter((recipe) => isLikelyVeganRecipe(recipe)) : recipes).slice(0, 3));
    };

    void loadRecent();
  }, [session, veganMode]);

  useEffect(() => {
    const syncVeganMode = () => setVeganMode(window.localStorage.getItem(VEGAN_STORAGE_KEY) === "true");
    syncVeganMode();
    window.addEventListener(PREFERENCES_EVENT, syncVeganMode);
    window.addEventListener("storage", syncVeganMode);

    return () => {
      window.removeEventListener(PREFERENCES_EVENT, syncVeganMode);
      window.removeEventListener("storage", syncVeganMode);
    };
  }, []);

  useEffect(() => {
    if (status !== "extracting") {
      setLoadingStep(0);
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingStep((step) => (step + 1) % LOADING_STEPS.length);
    }, 1800);

    return () => window.clearInterval(timer);
  }, [status]);

  async function extractRecipe() {
    if (!canExtract) return;
    setStatus("extracting");
    setError("");
    setExtracted(null);

    try {
      const response = await fetch("/api/extract-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error ?? "Tarif çıkarılamadı.");
      setExtracted(payload.recipe);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Beklenmeyen bir hata oldu.");
    } finally {
      setStatus("idle");
    }
  }

  async function saveRecipe() {
    if (!extracted || !session) return;
    setStatus("saving");
    setError("");

    try {
      const response = await fetch("/api/save-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ recipe: extracted, source_url: url })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Tarif kaydedilemedi.");
      window.location.href = `/recipes/${payload.id}`;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Beklenmeyen bir hata oldu.");
      setStatus("idle");
    }
  }

  return (
    <AuthGate>
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-6 pt-4">
        <div className="relative overflow-hidden rounded-[2.4rem] bg-gradient-to-br from-melon via-peach to-butter p-5 text-cocoa shadow-premium">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/25 blur-2xl" />
          <div className="absolute -bottom-16 left-8 h-40 w-40 rounded-full bg-papaya/25 blur-3xl" />
          <div className="relative text-center">
            <div className="flex flex-col items-center gap-4">
              <span className="logo-glow flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-[2.6rem] bg-white shadow-premium ring-4 ring-white/55">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/serra-logo.jpg" alt="Serra'nın Tarif Defteri" className="h-full w-full object-cover" />
              </span>
              <div className="min-w-0">
                <h1 className="block text-center text-4xl font-black leading-tight tracking-normal text-[#130b07] drop-shadow-[0_2px_0_rgba(255,240,216,0.45)]">
                  Serra&apos;nın Tarif Defteri
                </h1>
              </div>
            </div>
            <p className="mx-auto mt-5 max-w-md text-base font-black leading-7 text-cocoa">
              Aşkım, bugün ne pişiriyoruz? 💛
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-cocoa/75">
              Tarif linkini bana gönder, malzemeleri ve yapılışını senin için defterine ekleyeyim.
            </p>
            <p className="mx-auto mt-5 inline-flex rounded-full bg-white/40 px-4 py-2 text-xs font-black text-white shadow-soft">
              Bu uygulama sevgiyle kodlandı 🤍
            </p>
          </div>
        </div>

        <form
          className="soft-card rounded-[2rem] p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void extractRecipe();
          }}
        >
          <label className="text-sm font-semibold text-cocoa" htmlFor="recipe-url">
            Tarif linkini yapıştır
          </label>
          <div className="mt-3 flex rounded-[1.35rem] border border-melon/20 bg-white p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <input
              id="recipe-url"
              className="min-w-0 flex-1 rounded-2xl bg-transparent px-3 py-3 text-base outline-none"
              placeholder="Instagram, TikTok veya YouTube linki"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              inputMode="url"
            />
          </div>

          <button
            type="submit"
            disabled={!canExtract}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-papaya to-melon px-5 py-4 font-black text-white shadow-premium transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "extracting" ? <Loader2 className="animate-spin" size={18} /> : <WandSparkles size={18} />}
            {status === "extracting" ? "Tarif hazırlanıyor..." : "Tarifi çıkar"}
          </button>
        </form>

        {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}

        <div className="grid grid-cols-2 gap-3">
          <Link href="/assistant" className="soft-card rounded-3xl p-4 transition active:scale-[0.99]">
            <p className="text-2xl">✨</p>
            <h2 className="mt-2 text-base font-black text-cocoa">Bugün ne pişirsek?</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-cocoa/55">Dolaba, süreye ve ruh haline göre öneri al.</p>
          </Link>
          <Link href="/discover" className="soft-card rounded-3xl p-4 transition active:scale-[0.99]">
            <p className="text-2xl">🏆</p>
            <h2 className="mt-2 text-base font-black text-cocoa">Topluluk lezzetleri</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-cocoa/55">Random tarifleri puanla, liderleri gör.</p>
          </Link>
        </div>

        {extracted ? (
          <article className="soft-card overflow-hidden rounded-[2rem]">
            <SafeImage
              src={extracted.image_url}
              alt={extracted.title}
              className="h-56 w-full object-cover"
              fallback={<div className="h-10 bg-transparent" />}
            />
            <div className="p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-sage">Hazır tarif</p>
              <h2 className="mt-2 text-2xl font-black">{extracted.title}</h2>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-cream-100 px-3 py-1">{extracted.category}</span>
                <span className="rounded-full bg-cream-100 px-3 py-1">{extracted.cooking_time}</span>
                <span className="rounded-full bg-cream-100 px-3 py-1">{extracted.servings}</span>
              </div>
              {extracted.nutrition ? (
                <div className="mt-4 rounded-2xl bg-butter/60 px-4 py-3 text-sm font-semibold text-cocoa">
                  Yaklaşık {extracted.nutrition.calories_per_serving || extracted.nutrition.total_calories} kcal
                  {extracted.nutrition.calories_per_serving ? " / porsiyon" : ""}
                </div>
              ) : null}
              <button
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-cocoa px-5 py-4 font-black text-white"
                onClick={() => void saveRecipe()}
                disabled={status === "saving"}
              >
                {status === "saving" ? <Loader2 className="animate-spin" size={18} /> : <Heart size={18} />}
                Deftere kaydet
              </button>
            </div>
          </article>
        ) : null}

        <div className="flex items-center justify-between px-1">
          <h2 className="text-xl font-black">Son kaydedilenler</h2>
          <Link href="/recipes" className="text-sm font-black text-papaya">
            Tümü
          </Link>
        </div>
        <div className="grid gap-3">
          {recent.length ? (
            recent.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)
          ) : (
            <p className="soft-card rounded-3xl p-5 text-sm text-cocoa/70">
              Henüz kayıtlı tarif yok. İlk linkini yapıştırınca burası mis gibi dolacak.
            </p>
          )}
        </div>
      </section>

      {status === "extracting" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-cocoa/35 px-5 backdrop-blur-md">
          <article className="chef-pop w-full max-w-sm overflow-hidden rounded-[2rem] bg-white p-5 text-center shadow-premium">
            <span className="logo-glow mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-[2.2rem] bg-cream-100 ring-4 ring-melon/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/loading-chef.jpg" alt="Tarif hazırlanıyor" className="h-full w-full object-cover" />
            </span>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-sage">Tarif hazırlanıyor</p>
            <h2 className="mt-2 text-2xl font-black text-cocoa">{LOADING_STEPS[loadingStep]}</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-cocoa/65">Ben mutfakta koşturuyorum, az kaldı.</p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-cream-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-papaya to-melon transition-all duration-700"
                style={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }}
              />
            </div>
          </article>
        </div>
      ) : null}
    </AuthGate>
  );
}
