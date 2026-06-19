"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Sparkles, Star, Trophy } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { EmptyState } from "@/components/empty-state";
import { SafeImage } from "@/components/safe-image";
import { useAuth } from "@/components/auth-provider";
import type { DiscoverRecipe } from "@/lib/types";

type DiscoverPayload = {
  random: DiscoverRecipe[];
  leaderboard: DiscoverRecipe[];
};

const challenges = [
  { title: "20 Dakika Kraliçesi", description: "En pratik akşam yemeği tarifini keşfe taşı.", prize: "Hız puanı" },
  { title: "Vegan Parıltı", description: "Bitkisel, renkli ve kolay tarifler öne çıksın.", prize: "Yeşil rozet" },
  { title: "Dolaptan Çıkan Lezzet", description: "Evde kalan malzemelerle yaratıcı tarifleri puanla.", prize: "İsraf karşıtı" }
];

export default function DiscoverPage() {
  const { session } = useAuth();
  const [randomRecipes, setRandomRecipes] = useState<DiscoverRecipe[]>([]);
  const [leaderboard, setLeaderboard] = useState<DiscoverRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingRecipeId, setRatingRecipeId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadDiscover() {
    if (!session) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/discover-recipes", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      const payload = (await response.json()) as DiscoverPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Keşfet yüklenemedi.");
      setRandomRecipes(payload.random);
      setLeaderboard(payload.leaderboard);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Keşfet yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function rateRecipe(recipeId: string, rating: number) {
    if (!session) return;
    setRatingRecipeId(recipeId);
    setError("");

    try {
      const response = await fetch("/api/rate-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ recipe_id: recipeId, rating })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Puan kaydedilemedi.");
      await loadDiscover();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Puan kaydedilemedi.");
    } finally {
      setRatingRecipeId(null);
    }
  }

  useEffect(() => {
    void loadDiscover();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  return (
    <AuthGate>
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-5">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-papaya via-melon to-butter p-5 text-cocoa shadow-premium">
          <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/30 blur-2xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cocoa/55">Topluluk mutfağı</p>
              <h1 className="mt-2 text-3xl font-black">Yemek Keşfet</h1>
              <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-cocoa/70">
                Herkesin defterinden rastgele tarifler gör, yıldızla, en sevilenleri yukarı taşı.
              </p>
            </div>
            <button
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/45 text-cocoa shadow-soft"
              onClick={() => void loadDiscover()}
              disabled={loading}
              aria-label="Keşfi yenile"
            >
              {loading ? <Loader2 className="animate-spin" size={19} /> : <RefreshCw size={19} />}
            </button>
          </div>
        </div>

        {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}

        <div className="grid gap-3">
          {challenges.map((challenge) => (
            <article key={challenge.title} className="soft-card rounded-3xl p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-butter text-rosewood">
                  <Trophy size={18} />
                </span>
                <div>
                  <p className="text-base font-black text-cocoa">{challenge.title}</p>
                  <p className="mt-1 text-sm leading-6 text-cocoa/65">{challenge.description}</p>
                  <span className="mt-2 inline-flex rounded-full bg-cream-100 px-3 py-1 text-xs font-black text-cocoa/60">
                    {challenge.prize}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="flex items-center justify-between px-1">
          <h2 className="text-xl font-black">Bugünün rastgeleleri</h2>
          <Sparkles className="text-papaya" size={21} />
        </div>

        <div className="grid gap-3">
          {loading ? (
            <p className="soft-card rounded-3xl p-5 text-sm font-semibold text-cocoa/70">Keşif mutfağı hazırlanıyor...</p>
          ) : randomRecipes.length ? (
            randomRecipes.map((recipe) => (
              <DiscoverRecipeCard
                key={recipe.id}
                recipe={recipe}
                busy={ratingRecipeId === recipe.id}
                onRate={(rating) => void rateRecipe(recipe.id, rating)}
              />
            ))
          ) : (
            <EmptyState title="Keşifte tarif yok" description="İlk tarifler kaydedildikçe burası topluluk mutfağına dönüşecek." />
          )}
        </div>

        <div className="mt-2 flex items-center justify-between px-1">
          <h2 className="text-xl font-black">Leaderboard</h2>
          <Trophy className="text-butter" size={22} />
        </div>

        <div className="grid gap-3">
          {leaderboard.length ? (
            leaderboard.map((recipe, index) => (
              <LeaderboardCard
                key={recipe.id}
                rank={index + 1}
                recipe={recipe}
                busy={ratingRecipeId === recipe.id}
                onRate={(rating) => void rateRecipe(recipe.id, rating)}
              />
            ))
          ) : (
            <EmptyState title="Henüz lider yok" description="Tarifler puanlandıkça en sevilenler burada sıralanacak." />
          )}
        </div>
      </section>
    </AuthGate>
  );
}

function DiscoverRecipeCard({
  recipe,
  busy,
  onRate
}: {
  recipe: DiscoverRecipe;
  busy: boolean;
  onRate: (rating: number) => void;
}) {
  return (
    <article className="soft-card overflow-hidden rounded-[1.75rem]">
      <div className="relative h-44 bg-gradient-to-br from-melon via-peach to-butter">
        <SafeImage
          src={recipe.image_url}
          alt={recipe.title}
          className="h-full w-full object-cover"
          fallback={
            <div className="flex h-full items-center justify-center text-white">
              <Sparkles size={34} />
            </div>
          }
        />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-cocoa/45 to-transparent" />
        <RatingBadge recipe={recipe} />
      </div>
      <div className="p-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-sage">{recipe.category || "Tarif"}</p>
        <h3 className="mt-1 text-xl font-black leading-snug text-cocoa">{recipe.title}</h3>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-cocoa/70">
          <span className="rounded-full bg-cream-100 px-3 py-1.5">{recipe.cooking_time || "Süre yok"}</span>
          <span className="rounded-full bg-cream-100 px-3 py-1.5">{recipe.servings || "Kişi yok"}</span>
        </div>
        <StarPicker value={recipe.my_rating} busy={busy} onRate={onRate} />
      </div>
    </article>
  );
}

function LeaderboardCard({
  rank,
  recipe,
  busy,
  onRate
}: {
  rank: number;
  recipe: DiscoverRecipe;
  busy: boolean;
  onRate: (rating: number) => void;
}) {
  return (
    <article className="soft-card flex gap-3 rounded-[1.5rem] p-3">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-butter to-melon text-lg font-black text-white">
        #{rank}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-black text-cocoa">{recipe.title}</p>
        <p className="mt-1 text-xs font-semibold text-cocoa/60">
          {recipe.average_rating || "-"} puan · {recipe.rating_count} oy
        </p>
        <StarPicker value={recipe.my_rating} compact busy={busy} onRate={onRate} />
      </div>
    </article>
  );
}

function RatingBadge({ recipe }: { recipe: DiscoverRecipe }) {
  return (
    <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/92 px-3 py-1.5 text-sm font-black text-cocoa shadow-soft">
      <Star className="fill-butter text-butter" size={16} />
      {recipe.average_rating || "-"}
      <span className="text-xs font-semibold text-cocoa/45">({recipe.rating_count})</span>
    </span>
  );
}

function StarPicker({
  value,
  compact,
  busy,
  onRate
}: {
  value: number | null;
  compact?: boolean;
  busy: boolean;
  onRate: (rating: number) => void;
}) {
  return (
    <div className={`mt-4 flex items-center gap-1 ${compact ? "mt-2" : ""}`}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          className="grid h-9 w-9 place-items-center rounded-xl bg-cream-100 text-butter transition active:scale-95 disabled:opacity-60"
          onClick={() => onRate(rating)}
          disabled={busy}
          aria-label={`${rating} yıldız ver`}
        >
          <Star className={value && rating <= value ? "fill-butter" : ""} size={compact ? 16 : 18} />
        </button>
      ))}
      {busy ? <Loader2 className="ml-2 animate-spin text-cocoa/45" size={17} /> : null}
    </div>
  );
}
