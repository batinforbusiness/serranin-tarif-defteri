"use client";

import Link from "next/link";
import { Clock, Heart, Sparkles, Trash2, Users } from "lucide-react";
import { SafeImage } from "@/components/safe-image";
import type { RecipeSummary } from "@/lib/types";

export function RecipeCard({
  recipe,
  onDelete,
  deleting
}: {
  recipe: RecipeSummary;
  onDelete?: (recipe: RecipeSummary) => void;
  deleting?: boolean;
}) {
  return (
    <article className="soft-card group overflow-hidden rounded-[1.75rem] transition hover:-translate-y-0.5 active:scale-[0.99]">
      <Link href={`/recipes/${recipe.id}`} className="block">
        <div className="relative h-40 bg-gradient-to-br from-melon via-peach to-butter">
          <SafeImage
            src={recipe.image_url}
            alt={recipe.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            fallback={
              <div className="flex h-full items-center justify-center text-white">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-white/25 shadow-premium backdrop-blur">
                  <Sparkles size={30} />
                </div>
              </div>
            }
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-cocoa/45 to-transparent" />
          <Heart
            className={`absolute right-4 top-4 rounded-full bg-white/90 p-1.5 shadow-soft ${
              recipe.is_favorite ? "fill-papaya text-papaya" : "text-cocoa/45"
            }`}
            size={32}
          />
        </div>
      </Link>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Link href={`/recipes/${recipe.id}`} className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-sage">{recipe.category || "Tarif"}</p>
            <h3 className="mt-1 text-xl font-black leading-snug text-cocoa">{recipe.title}</h3>
          </Link>
          {onDelete ? (
            <button
              type="button"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600 shadow-soft transition active:scale-95 disabled:opacity-50"
              onClick={() => onDelete(recipe)}
              disabled={deleting}
              aria-label={`${recipe.title} tarifini sil`}
            >
              <Trash2 size={17} />
            </button>
          ) : null}
        </div>
        <Link href={`/recipes/${recipe.id}`} className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-cocoa/70">
          <span className="inline-flex items-center gap-1 rounded-full bg-cream-100 px-3 py-1.5">
            <Clock size={13} />
            {recipe.cooking_time || "-"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-cream-100 px-3 py-1.5">
            <Users size={13} />
            {recipe.servings || "-"}
          </span>
        </Link>
      </div>
    </article>
  );
}
