"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChefHat, Leaf, Loader2, Plus, Refrigerator, Sparkles, X } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { IngredientIcon } from "@/components/ingredient-icon";
import { VEGAN_STORAGE_KEY } from "@/components/theme-client";
import { useAuth } from "@/components/auth-provider";
import type { MealAssistantResult } from "@/lib/meal-assistant";

type AssistantMode = "pantry" | "today" | "weekly";

const modes = [
  { id: "today", label: "Bugun ne pisirsek?", icon: ChefHat },
  { id: "pantry", label: "Dolapta ne var?", icon: Refrigerator },
  { id: "weekly", label: "Haftalik menu", icon: CalendarDays }
] satisfies Array<{ id: AssistantMode; label: string; icon: typeof ChefHat }>;

const pantryOptions = [
  "yumurta",
  "peynir",
  "yogurt",
  "tavuk",
  "kiyma",
  "domates",
  "patates",
  "havuç",
  "kabak",
  "makarna",
  "pirinç",
  "nohut",
  "mercimek",
  "süt",
  "un",
  "ton balik",
  "mantar",
  "brokoli",
  "biber",
  "sogan"
];

const preferenceOptions = ["Pratik", "Dusuk kalorili", "Acili", "Cocuk dostu", "Airfryer", "Misafirlik", "Proteinli", "Butce dostu"];
const TASTE_PROFILE_KEY = "serra-taste-profile";

export default function AssistantPage() {
  const { session } = useAuth();
  const [mode, setMode] = useState<AssistantMode>("today");
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [extraIngredient, setExtraIngredient] = useState("");
  const [mood, setMood] = useState("");
  const [maxMinutes, setMaxMinutes] = useState("30");
  const [preferences, setPreferences] = useState<string[]>(["Pratik"]);
  const [veganMode, setVeganMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MealAssistantResult | null>(null);
  const [error, setError] = useState("");

  const pantry = useMemo(
    () => Array.from(new Set([...selectedIngredients, ...splitExtraIngredients(extraIngredient)])).join(", "),
    [selectedIngredients, extraIngredient]
  );

  useEffect(() => {
    setVeganMode(window.localStorage.getItem(VEGAN_STORAGE_KEY) === "true");
    const tasteProfile = JSON.parse(window.localStorage.getItem(TASTE_PROFILE_KEY) || "[]") as string[];
    setPreferences((current) => Array.from(new Set([...current, ...tasteProfile])));
  }, []);

  function toggleIngredient(ingredient: string) {
    setSelectedIngredients((current) =>
      current.includes(ingredient) ? current.filter((item) => item !== ingredient) : [...current, ingredient]
    );
  }

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
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cocoa/55">Serra AI mutfak asistani</p>
            <h1 className="mt-2 text-3xl font-black">Bugun mutfakta ne yapiyoruz?</h1>
            <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-cocoa/70">
              Hazir malzemeleri sec, ruh halini soyle; Serra sana uygulanabilir yemek fikri cikarsin.
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
                onClick={() => {
                  setMode(item.id);
                  setResult(null);
                }}
              >
                <Icon className="mx-auto mb-2" size={20} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="soft-card rounded-[2rem] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-cocoa">{modeTitle(mode)}</h2>
              <p className="mt-1 text-sm font-semibold text-cocoa/55">{modeHint(mode)}</p>
            </div>
            {veganMode ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-mint px-3 py-2 text-xs font-black text-sage">
                <Leaf size={13} />
                Vegan
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
            {pantryOptions.map((ingredient) => {
              const active = selectedIngredients.includes(ingredient);
              return (
                <button
                  key={ingredient}
                  className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-3xl border px-2 py-3 text-xs font-black transition active:scale-95 ${
                    active ? "border-papaya bg-butter/50 text-cocoa shadow-soft" : "border-melon/10 bg-white text-cocoa/65"
                  }`}
                  onClick={() => toggleIngredient(ingredient)}
                >
                  <IngredientIcon name={ingredient} />
                  <span className="text-center leading-tight">{ingredient}</span>
                </button>
              );
            })}
          </div>

          {selectedIngredients.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedIngredients.map((ingredient) => (
                <button
                  key={ingredient}
                  className="inline-flex items-center gap-1 rounded-full bg-cocoa px-3 py-2 text-xs font-black text-white"
                  onClick={() => toggleIngredient(ingredient)}
                >
                  {ingredient}
                  <X size={13} />
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-4 rounded-3xl bg-cream-100/70 p-3">
            <label className="text-sm font-black text-cocoa">Listede yoksa ekle</label>
            <div className="mt-2 flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-2xl border border-melon/15 bg-white px-4 py-3 text-sm outline-none"
                placeholder="ornek: avokado, lor, bulgur"
                value={extraIngredient}
                onChange={(event) => setExtraIngredient(event.target.value)}
              />
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-papaya">
                <Plus size={18} />
              </span>
            </div>
          </div>

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
          </div>

          <button
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-papaya to-melon px-5 py-4 font-black text-white shadow-premium disabled:opacity-55"
            onClick={() => void askAssistant()}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            {loading ? "Serra dusunuyor..." : "Serra'ya sor"}
          </button>
        </div>

        {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}

        {result ? (
          <section className="grid gap-3">
            <div className="soft-card rounded-3xl p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sage">Oneri hazir</p>
              <h2 className="mt-2 text-2xl font-black text-cocoa">{result.title}</h2>
              <p className="mt-2 text-sm leading-6 text-cocoa/70">{result.summary}</p>
              <p className="mt-4 rounded-2xl bg-cream-100 px-4 py-3 text-sm font-black text-rosewood">{result.serra_note}</p>
            </div>

            {result.suggestions.map((suggestion, index) => (
              <article key={`${suggestion.title}-${index}`} className="soft-card overflow-hidden rounded-3xl">
                <div className="h-32 bg-gradient-to-br from-melon via-peach to-butter p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-cocoa/55">{suggestion.time}</p>
                  <h3 className="mt-2 text-2xl font-black leading-tight text-cocoa">{suggestion.title}</h3>
                </div>
                <div className="p-5">
                  <p className="text-sm leading-6 text-cocoa/70">{suggestion.reason}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {suggestion.ingredients.map((ingredient) => (
                      <span key={ingredient} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-cocoa/65 shadow-soft">
                        <IngredientIcon name={ingredient} size="sm" />
                        {ingredient}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-cocoa/70">
                    {suggestion.steps.slice(0, 5).map((step, stepIndex) => (
                      <p key={`${step}-${stepIndex}`} className="rounded-2xl bg-cream-100/70 px-4 py-3">
                        {stepIndex + 1}. {step}
                      </p>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </section>
    </AuthGate>
  );
}

function splitExtraIngredients(value: string) {
  return value
    .split(/[,.\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function modeTitle(mode: AssistantMode) {
  if (mode === "pantry") return "Evde ne var?";
  if (mode === "weekly") return "Haftalik menu icin sec";
  return "Bugun canin neye yakin?";
}

function modeHint(mode: AssistantMode) {
  if (mode === "pantry") return "Malzemeleri tikla, ekstra varsa ekle.";
  if (mode === "weekly") return "Bu secimlerle 7 gunluk plan cikaralim.";
  return "Bugunluk pratik ve keyifli oneriler gelsin.";
}
