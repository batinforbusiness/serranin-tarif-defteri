"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookPlus, ChefHat, Heart, Loader2, RefreshCw, Sparkles, Star, Trophy, X } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { EmptyState } from "@/components/empty-state";
import { SafeImage } from "@/components/safe-image";
import { useAuth } from "@/components/auth-provider";
import type { DiscoverRecipe } from "@/lib/types";

type DiscoverPayload = {
  random: DiscoverRecipe[];
  leaderboard: DiscoverRecipe[];
};

type SwipeDirection = "left" | "right";

export default function DiscoverPage() {
  const { session } = useAuth();
  const [deck, setDeck] = useState<DiscoverRecipe[]>([]);
  const [leaderboard, setLeaderboard] = useState<DiscoverRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dragStart, setDragStart] = useState<number | null>(null);

  const currentRecipe = deck[0] ?? null;
  const nextRecipe = deck[1] ?? null;

  async function loadDiscover() {
    if (!session) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/discover-recipes", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      const payload = (await response.json()) as DiscoverPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Kesfet yuklenemedi.");
      setDeck(payload.random);
      setLeaderboard(payload.leaderboard);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Kesfet yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  function skipCard() {
    setMessage("");
    setDeck((current) => current.slice(1));
  }

  async function rateRecipe(recipe: DiscoverRecipe, rating: number) {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/rate-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ recipe_id: recipe.id, rating })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Puan kaydedilemedi.");
      setMessage(`${recipe.title} yildizlandi.`);
      setDeck((current) => current.slice(1));
      setLeaderboard((current) => updateLeaderboard(current, recipe, rating));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Puan kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function copyRecipe(recipe: DiscoverRecipe) {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/copy-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ recipe_id: recipe.id })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Tarif deftere eklenemedi.");
      setMessage("Tarif defterine eklendi.");
      setDeck((current) => current.slice(1));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tarif deftere eklenemedi.");
    } finally {
      setBusy(false);
    }
  }

  function handleSwipe(direction: SwipeDirection) {
    if (!currentRecipe || busy) return;
    if (direction === "left") skipCard();
    if (direction === "right") void rateRecipe(currentRecipe, 5);
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
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cocoa/55">Topluluk mutfagi</p>
              <h1 className="mt-2 text-3xl font-black">Yemek Kesfet</h1>
              <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-cocoa/70">
                Kartlari kaydir, begen, puanla ve guzel tarifleri kendi defterine ekle.
              </p>
            </div>
            <button
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/45 text-cocoa shadow-soft"
              onClick={() => void loadDiscover()}
              disabled={loading}
              aria-label="Kesfi yenile"
            >
              {loading ? <Loader2 className="animate-spin" size={19} /> : <RefreshCw size={19} />}
            </button>
          </div>
        </div>

        {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
        {message ? <p className="rounded-2xl bg-mint px-4 py-3 text-sm font-black text-sage">{message}</p> : null}

        <div className="relative">
          {loading ? (
            <div className="soft-card grid min-h-[520px] place-items-center rounded-[2rem] p-6 text-center">
              <div>
                <Loader2 className="mx-auto animate-spin text-papaya" size={34} />
                <p className="mt-4 text-sm font-black text-cocoa/65">Sana guzel kartlar hazirlaniyor...</p>
              </div>
            </div>
          ) : currentRecipe ? (
            <>
              {nextRecipe ? <RecipeSwipeCard recipe={nextRecipe} muted /> : null}
              <RecipeSwipeCard
                recipe={currentRecipe}
                busy={busy}
                onTouchStart={(x) => setDragStart(x)}
                onTouchEnd={(x) => {
                  if (dragStart === null) return;
                  const diff = x - dragStart;
                  setDragStart(null);
                  if (Math.abs(diff) < 65) return;
                  handleSwipe(diff > 0 ? "right" : "left");
                }}
                onRate={(rating) => void rateRecipe(currentRecipe, rating)}
                onCopy={() => void copyRecipe(currentRecipe)}
                onSkip={skipCard}
              />
            </>
          ) : (
            <EmptyState title="Bugunluk kartlar bitti" description="Yenile butonuna basinca yeni rastgele tarifler gelir." />
          )}
        </div>

        <section className="grid gap-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-black">En sevilenler</h2>
            <Trophy className="text-butter" size={22} />
          </div>
          {leaderboard.length ? (
            leaderboard.slice(0, 5).map((recipe, index) => <LeaderboardCard key={recipe.id} rank={index + 1} recipe={recipe} />)
          ) : (
            <EmptyState title="Henuz lider yok" description="Tarifler puanlandikca burada siralanacak." />
          )}
        </section>
      </section>
    </AuthGate>
  );
}

function RecipeSwipeCard({
  recipe,
  muted,
  busy,
  onTouchStart,
  onTouchEnd,
  onRate,
  onCopy,
  onSkip
}: {
  recipe: DiscoverRecipe;
  muted?: boolean;
  busy?: boolean;
  onTouchStart?: (x: number) => void;
  onTouchEnd?: (x: number) => void;
  onRate?: (rating: number) => void;
  onCopy?: () => void;
  onSkip?: () => void;
}) {
  const meta = useMemo(() => [recipe.cooking_time, recipe.servings, recipe.category].filter(Boolean).slice(0, 3), [recipe]);

  return (
    <article
      className={`${muted ? "pointer-events-none absolute inset-x-0 top-0 translate-y-7 scale-[0.94] opacity-35" : "relative z-10"} overflow-hidden rounded-[2.2rem] bg-white shadow-premium transition`}
      onTouchStart={(event) => onTouchStart?.(event.changedTouches[0].clientX)}
      onTouchEnd={(event) => onTouchEnd?.(event.changedTouches[0].clientX)}
    >
      <Link href={`/recipes/${recipe.id}`} className="block">
        <div className="relative h-72 bg-gradient-to-br from-melon via-peach to-butter">
          <SafeImage
            src={recipe.image_url}
            alt={recipe.title}
            className="h-full w-full object-cover"
            fallback={
              <div className="flex h-full flex-col items-center justify-center gap-3 text-white">
                <ChefHat size={42} />
                <span className="text-sm font-black">Tarif fotografi bekleniyor</span>
              </div>
            }
          />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-cocoa/65 to-transparent" />
          <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-2 text-sm font-black text-cocoa shadow-soft">
            <Star className="fill-butter text-butter" size={16} />
            {recipe.average_rating || "-"}
            <span className="text-xs text-cocoa/45">({recipe.rating_count})</span>
          </span>
        </div>
      </Link>

      <div className="p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-sage">{recipe.category || "Tarif"}</p>
        <Link href={`/recipes/${recipe.id}`}>
          <h2 className="mt-2 text-3xl font-black leading-tight text-cocoa">{recipe.title}</h2>
        </Link>
        <div className="mt-4 flex flex-wrap gap-2">
          {meta.map((item) => (
            <span key={item} className="rounded-full bg-cream-100 px-3 py-1.5 text-xs font-black text-cocoa/65">
              {item}
            </span>
          ))}
        </div>

        {!muted ? (
          <>
            <div className="mt-5 grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  className="grid h-11 place-items-center rounded-2xl bg-cream-100 text-butter active:scale-95 disabled:opacity-50"
                  disabled={busy}
                  onClick={() => onRate?.(rating)}
                  aria-label={`${rating} yildiz`}
                >
                  <Star className={recipe.my_rating && rating <= recipe.my_rating ? "fill-butter" : ""} size={18} />
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button className="flex items-center justify-center gap-2 rounded-2xl bg-red-50 px-3 py-4 font-black text-red-700 disabled:opacity-50" disabled={busy} onClick={onSkip}>
                <X size={18} />
                Gec
              </button>
              <button className="flex items-center justify-center gap-2 rounded-2xl bg-cocoa px-3 py-4 font-black text-white disabled:opacity-50" disabled={busy} onClick={onCopy}>
                {busy ? <Loader2 className="animate-spin" size={18} /> : <BookPlus size={18} />}
                Ekle
              </button>
              <button className="flex items-center justify-center gap-2 rounded-2xl bg-mint px-3 py-4 font-black text-sage disabled:opacity-50" disabled={busy} onClick={() => onRate?.(5)}>
                <Heart size={18} />
                Begendim
              </button>
            </div>
            <p className="mt-3 text-center text-xs font-semibold text-cocoa/45">Saga kaydir: begen, sola kaydir: gec.</p>
          </>
        ) : null}
      </div>
    </article>
  );
}

function LeaderboardCard({ rank, recipe }: { rank: number; recipe: DiscoverRecipe }) {
  return (
    <Link href={`/recipes/${recipe.id}`} className="soft-card flex gap-3 rounded-[1.5rem] p-3">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-butter to-melon text-lg font-black text-white">
        #{rank}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-black text-cocoa">{recipe.title}</p>
        <p className="mt-1 text-xs font-semibold text-cocoa/60">
          {recipe.average_rating || "-"} puan · {recipe.rating_count} oy
        </p>
      </div>
      <Sparkles className="mt-1 shrink-0 text-papaya" size={18} />
    </Link>
  );
}

function updateLeaderboard(items: DiscoverRecipe[], recipe: DiscoverRecipe, rating: number) {
  const nextRatingCount = recipe.my_rating ? recipe.rating_count : recipe.rating_count + 1;
  const previousTotal = recipe.average_rating * recipe.rating_count;
  const nextTotal = recipe.my_rating ? previousTotal - recipe.my_rating + rating : previousTotal + rating;
  const updatedRecipe = {
    ...recipe,
    my_rating: rating,
    rating_count: nextRatingCount,
    average_rating: Number((nextTotal / Math.max(nextRatingCount, 1)).toFixed(1))
  };
  const without = items.filter((item) => item.id !== recipe.id);
  return [...without, updatedRecipe]
    .sort((a, b) => b.average_rating - a.average_rating || b.rating_count - a.rating_count)
    .slice(0, 10);
}
