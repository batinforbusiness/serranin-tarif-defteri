"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ChefHat, Leaf, Loader2, Refrigerator, Sparkles } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { VEGAN_STORAGE_KEY } from "@/components/theme-client";
import { useAuth } from "@/components/auth-provider";
import type { MealAssistantResult } from "@/lib/meal-assistant";

type AssistantMode = "pantry" | "today" | "weekly";

const modes = [
  { id: "today", label: "Bugün ne pişirsek?", icon: ChefHat },
  { id: "pantry", label: "Dolapta ne var?", icon: Refrigerator },
  { id: "weekly", label: "Haftalık menü", icon: CalendarDays }
] satisfies Array<{ id: AssistantMode; label: string; icon: typeof ChefHat }>;

const preferenceOptions = ["Pratik", "Düşük kalorili", "Acılı", "Çocuk dostu", "Airfryer", "Misafirlik"];
const TASTE_PROFILE_KEY = "serra-taste-profile";

export default function AssistantPage() {
  const { session } = useAuth();
  const [mode, setMode] = useState<AssistantMode>("today");
  const [pantry, setPantry] = useState("");
  const [mood, setMood] = useState("");
  const [maxMinutes, setMaxMinutes] = useState("30");
  const [preferences, setPreferences] = useState<string[]>(["Pratik"]);
  const [veganMode, setVeganMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MealAssistantResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setVeganMode(window.localStorage.getItem(VEGAN_STORAGE_KEY) === "true");
    const tasteProfile = JSON.parse(window.localStorage.getItem(TASTE_PROFILE_KEY) || "[]") as string[];
    setPreferences((current) => Array.from(new Set([...current, ...tasteProfile])));
  }, []);

  function togglePreference(preference: string) {
    setPreferences((current) =>
      current.includes(preference) ? current.filter((item) => item !== preference) : [...current, preference]
    );
  }

  async function askAssistant() {
    if (!session) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/meal-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          mode,
          pantry,
          mood,
          max_minutes: Number(maxMinutes) || 30,
          preferences,
          vegan_mode: veganMode
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Asistan cevap veremedi.");
      setResult(payload.result as MealAssistantResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Asistan cevap veremedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGate>
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-5">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-melon via-peach to-butter p-5 text-cocoa shadow-premium">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/30 blur-2xl" />
          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cocoa/55">Serra AI mutfak asistanı</p>
            <h1 className="mt-2 text-3xl font-black">Bugün mutfakta ne yapıyoruz?</h1>
            <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-cocoa/70">
              Dolaptaki malzemeden fikir çıkar, ruh haline göre yemek öner, haftalık menüyü tek dokunuşla hazırla.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {modes.map((item) => {
            const Icon = item.icon;
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                className={`rounded-3xl px-3 py-4 text-center text-xs font-black shadow-soft transition ${
                  active ? "bg-cocoa text-white" : "bg-white/85 text-cocoa/65"
                }`}
                onClick={() => setMode(item.id)}
              >
                <Icon className="mx-auto mb-2" size={20} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="soft-card rounded-[2rem] p-5">
          <label className="text-sm font-black text-cocoa">Evde ne var?</label>
          <textarea
            className="mt-3 min-h-28 w-full resize-none rounded-3xl border border-melon/15 bg-white px-4 py-4 text-sm outline-none focus:ring-4 focus:ring-melon/10"
            placeholder="Örn: kabak, patates, yoğurt, domates, makarna..."
            value={pantry}
            onChange={(event) => setPantry(event.target.value)}
          />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <input
              className="rounded-2xl border border-melon/15 bg-white px-4 py-3 text-sm outline-none"
              placeholder="Ruh hali"
              value={mood}
              onChange={(event) => setMood(event.target.value)}
            />
            <input
              className="rounded-2xl border border-melon/15 bg-white px-4 py-3 text-sm outline-none"
              placeholder="Dakika"
              inputMode="numeric"
              value={maxMinutes}
              onChange={(event) => setMaxMinutes(event.target.value)}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {preferenceOptions.map((preference) => {
              const active = preferences.includes(preference);
              return (
                <button
                  key={preference}
                  className={`rounded-full px-3 py-2 text-xs font-black transition ${
                    active ? "bg-butter text-cocoa" : "bg-cream-100 text-cocoa/55"
                  }`}
                  onClick={() => togglePreference(preference)}
                >
                  {preference}
                </button>
              );
            })}
            {veganMode ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-mint px-3 py-2 text-xs font-black text-sage">
                <Leaf size={13} />
                Vegan mod
              </span>
            ) : null}
          </div>

          <button
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-papaya to-melon px-5 py-4 font-black text-white shadow-premium disabled:opacity-55"
            onClick={() => void askAssistant()}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            {loading ? "Mutfak fikri hazırlanıyor..." : "Serra'ya sor"}
          </button>
        </div>

        {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}

        {result ? (
          <section className="grid gap-3">
            <div className="soft-card rounded-3xl p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sage">Öneri hazır</p>
              <h2 className="mt-2 text-2xl font-black text-cocoa">{result.title}</h2>
              <p className="mt-2 text-sm leading-6 text-cocoa/70">{result.summary}</p>
              <p className="mt-4 rounded-2xl bg-cream-100 px-4 py-3 text-sm font-black text-rosewood">{result.serra_note}</p>
            </div>

            {result.suggestions.map((suggestion, index) => (
              <article key={`${suggestion.title}-${index}`} className="soft-card rounded-3xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-sage">{suggestion.time}</p>
                    <h3 className="mt-1 text-xl font-black text-cocoa">{suggestion.title}</h3>
                  </div>
                  <span className="rounded-full bg-butter px-3 py-1 text-xs font-black text-cocoa">{index + 1}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-cocoa/70">{suggestion.reason}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {suggestion.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-cream-100 px-3 py-1 text-xs font-black text-cocoa/60">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4 grid gap-2 text-sm text-cocoa/70">
                  {suggestion.steps.slice(0, 4).map((step) => (
                    <p key={step} className="rounded-2xl bg-white px-4 py-3">
                      {step}
                    </p>
                  ))}
                </div>
              </article>
            ))}

            {result.shopping_focus.length ? (
              <div className="soft-card rounded-3xl p-5">
                <h3 className="text-lg font-black text-cocoa">Alışverişte bakılacaklar</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.shopping_focus.map((item) => (
                    <span key={item} className="rounded-full bg-mint px-3 py-2 text-xs font-black text-sage">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </section>
    </AuthGate>
  );
}
