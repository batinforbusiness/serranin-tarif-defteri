"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Leaf, Sparkles } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { EmptyState } from "@/components/empty-state";
import { RecipeCard } from "@/components/recipe-card";
import { PREFERENCES_EVENT, VEGAN_STORAGE_KEY } from "@/components/theme-client";
import { useAuth } from "@/components/auth-provider";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { RecipeSummary } from "@/lib/types";
import { isLikelyVeganRecipe, type VeganCheckRecipe } from "@/lib/vegan";

type RecipeListItem = RecipeSummary & VeganCheckRecipe;

const ALL_CATEGORY = "Tümü";
const colorDots = ["bg-melon", "bg-butter", "bg-mint", "bg-berry", "bg-peach"];

export default function RecipesPage() {
  const { session } = useAuth();
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
  const [loading, setLoading] = useState(true);
  const [veganMode, setVeganMode] = useState(false);
  const [deletingRecipeId, setDeletingRecipeId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

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
    if (!session) return;

    const loadRecipes = async () => {
      setLoading(true);
      const supabase = getBrowserSupabase();
      const { data } = await supabase
        .from("recipes")
        .select("*,recipe_ingredients(name)")
        .order("created_at", { ascending: false });
      setRecipes((data ?? []) as RecipeListItem[]);
      setLoading(false);
    };

    void loadRecipes();
  }, [session]);

  const visibleRecipes = useMemo(() => {
    if (!veganMode) return recipes;
    return recipes.filter((recipe) => isLikelyVeganRecipe(recipe));
  }, [recipes, veganMode]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(visibleRecipes.map((recipe) => normalizeCategory(recipe.category))));
    return [ALL_CATEGORY, ...unique.filter((category) => category !== ALL_CATEGORY)];
  }, [visibleRecipes]);

  const filteredRecipes = useMemo(() => {
    if (selectedCategory === ALL_CATEGORY) return visibleRecipes;
    return visibleRecipes.filter((recipe) => normalizeCategory(recipe.category) === selectedCategory);
  }, [visibleRecipes, selectedCategory]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    map.set(ALL_CATEGORY, visibleRecipes.length);
    for (const recipe of visibleRecipes) {
      const category = normalizeCategory(recipe.category);
      map.set(category, (map.get(category) ?? 0) + 1);
    }
    return map;
  }, [visibleRecipes]);

  useEffect(() => {
    if (!categories.includes(selectedCategory)) setSelectedCategory(ALL_CATEGORY);
  }, [categories, selectedCategory]);

  async function deleteRecipe(recipe: RecipeListItem) {
    if (!window.confirm(`${recipe.title} tarifini silmek istiyor musun?`)) return;

    setDeletingRecipeId(recipe.id);
    setMessage("");

    const supabase = getBrowserSupabase();
    const { error } = await supabase.from("recipes").delete().eq("id", recipe.id);

    if (error) {
      setMessage("Tarif silinemedi. Sadece kendi kaydettiğin tarifleri silebilirsin.");
    } else {
      setRecipes((current) => current.filter((item) => item.id !== recipe.id));
      setMessage("Tarif silindi.");
    }

    setDeletingRecipeId(null);
  }

  return (
    <AuthGate>
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-5">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-cocoa via-rosewood to-papaya p-5 text-white shadow-premium">
          <div className="absolute right-4 top-4 h-20 w-20 rounded-full bg-butter/25 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-[1.3rem] bg-white/16 backdrop-blur">
              {veganMode ? <Leaf size={26} /> : <BookOpen size={26} />}
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">
                {veganMode ? "Vegan defter" : "Kategori defteri"}
              </p>
              <h1 className="mt-1 text-3xl font-black">Tarifler</h1>
              <p className="mt-1 text-sm font-medium text-white/75">
                {veganMode ? "Vegan uyumlu tarifleri yeşil modda gez." : "Kaydettiğin tarifleri kategori kategori gez."}
              </p>
            </div>
          </div>
        </div>

        {veganMode ? (
          <div className="soft-card rounded-3xl border-sage/20 bg-mint/70 p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-sage shadow-soft">
                <Leaf size={18} />
              </span>
              <p className="text-sm font-black text-sage">
                Vegan mod açık. Et, süt ürünü, yumurta ve bal içeren tarifler bu listede gizlenir.
              </p>
            </div>
          </div>
        ) : null}

        {message ? <p className="rounded-2xl bg-cream-100 px-4 py-3 text-sm font-black text-cocoa/70">{message}</p> : null}

        {visibleRecipes.length ? (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {categories.map((category, index) => {
              const active = selectedCategory === category;
              return (
                <button
                  key={category}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-black transition ${
                    active
                      ? veganMode
                        ? "bg-gradient-to-r from-sage to-mint text-white shadow-premium"
                        : "bg-gradient-to-r from-melon to-butter text-white shadow-premium"
                      : "bg-white/80 text-cocoa/65 shadow-soft"
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${colorDots[index % colorDots.length]}`} />
                  {category}
                  <span className="rounded-full bg-white/35 px-2 py-0.5 text-xs">{categoryCounts.get(category) ?? 0}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="grid gap-3">
          {loading ? (
            <p className="soft-card rounded-3xl p-5 text-sm text-cocoa/70">Tarifler yükleniyor...</p>
          ) : filteredRecipes.length ? (
            filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onDelete={(item) => void deleteRecipe(item as RecipeListItem)}
                deleting={deletingRecipeId === recipe.id}
              />
            ))
          ) : recipes.length && veganMode ? (
            <EmptyState
              title="Vegan tarif görünmüyor"
              description="Bu mod açıkken sadece vegan uyumlu tarifler listelenir. Yeni vegan tarif ekleyince burada görünür."
            />
          ) : recipes.length ? (
            <EmptyState title="Bu kategoride tarif yok" description="Başka bir kategori seçebilir ya da yeni tarif kaydedebilirsin." />
          ) : (
            <EmptyState title="Defter boş" description="Ana sayfadan bir tarif linki çıkarıp kaydedebilirsin." />
          )}
        </div>

        {visibleRecipes.length ? (
          <div className="soft-card rounded-3xl p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-melon to-butter text-white">
                <Sparkles size={18} />
              </span>
              <p className="text-sm font-semibold text-cocoa/75">
                {veganMode
                  ? "Vegan öneri motoru için temel hazır: sonraki sürümde otomatik önerilere bağlayabiliriz."
                  : "Yeni tarifler AI çıktısındaki kategoriye göre otomatik gruplanır."}
              </p>
            </div>
          </div>
        ) : null}
      </section>
    </AuthGate>
  );
}

function normalizeCategory(category: string | null | undefined) {
  return category?.trim() || "Genel";
}
