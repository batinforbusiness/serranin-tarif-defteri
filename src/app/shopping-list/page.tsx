"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ShoppingBasket } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { EmptyState } from "@/components/empty-state";
import { IngredientIcon } from "@/components/ingredient-icon";
import { useAuth } from "@/components/auth-provider";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { ShoppingItem } from "@/lib/types";

type ShoppingItemWithRecipe = ShoppingItem & {
  recipe_id: string | null;
  recipes?: {
    title: string | null;
  } | null;
};

type GroupedItem = {
  key: string;
  name: string;
  unit: string;
  amount: string;
  aisle: string;
  ids: string[];
  is_checked: boolean;
};

type ShoppingCard = {
  key: string;
  title: string;
  created_at: string;
  items: GroupedItem[];
  checkedCount: number;
};

export default function ShoppingListPage() {
  const { session } = useAuth();
  const [items, setItems] = useState<ShoppingItemWithRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!session) return;

    const loadItems = async () => {
      setLoading(true);
      const supabase = getBrowserSupabase();
      const { data } = await supabase
        .from("shopping_items")
        .select("id,recipe_id,name,amount,unit,is_checked,created_at,recipes(title)")
        .order("created_at", { ascending: false });
      setItems((data ?? []) as ShoppingItemWithRecipe[]);
      setLoading(false);
    };

    void loadItems();
  }, [session]);

  const cards = useMemo(() => {
    const cardMap = new Map<string, ShoppingCard>();

    for (const item of items) {
      const cardKey = item.recipe_id ?? "general";
      const title = item.recipes?.title ? `${item.recipes.title} Alışverişi` : "Alışveriş";
      const card =
        cardMap.get(cardKey) ??
        ({
          key: cardKey,
          title,
          created_at: item.created_at,
          items: [],
          checkedCount: 0
        } satisfies ShoppingCard);

      const itemKey = `${item.name.toLocaleLowerCase("tr-TR")}::${item.unit ?? ""}`;
      const current = card.items.find((group) => group.key === itemKey);

      if (!current) {
        card.items.push({
          key: itemKey,
          name: item.name,
          unit: item.unit ?? "",
          amount: item.amount ?? "",
          aisle: getAisle(item.name),
          ids: [item.id],
          is_checked: item.is_checked
        });
      } else {
        current.ids.push(item.id);
        current.amount = [current.amount, item.amount].filter(Boolean).join(" + ");
        current.is_checked = current.is_checked && item.is_checked;
      }

      card.checkedCount = card.items.filter((group) => group.is_checked).length;
      if (new Date(item.created_at) > new Date(card.created_at)) card.created_at = item.created_at;
      cardMap.set(cardKey, card);
    }

    return Array.from(cardMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [items]);

  useEffect(() => {
    setOpenCards((current) => {
      if (Object.keys(current).length || !cards.length) return current;
      return { [cards[0].key]: true };
    });
  }, [cards]);

  async function toggleGroup(group: GroupedItem) {
    const next = !group.is_checked;
    const supabase = getBrowserSupabase();
    await supabase.from("shopping_items").update({ is_checked: next }).in("id", group.ids);
    setItems((current) => current.map((item) => (group.ids.includes(item.id) ? { ...item, is_checked: next } : item)));
  }

  function toggleCard(key: string) {
    setOpenCards((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <AuthGate>
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-5">
        <div>
          <h1 className="text-3xl font-semibold">Alışveriş Listesi</h1>
          <p className="mt-1 text-sm text-cocoa/65">Tarife göre kartlara ayrılır, tıklayınca malzemeler açılır.</p>
        </div>

        {loading ? (
          <p className="soft-card rounded-3xl p-5 text-sm text-cocoa/70">Liste yükleniyor...</p>
        ) : cards.length ? (
          <div className="grid gap-3">
            {cards.map((card) => {
              const isOpen = openCards[card.key] ?? false;

              return (
                <article key={card.key} className="soft-card overflow-hidden rounded-3xl">
                  <button
                    className="flex w-full items-center justify-between gap-4 p-5 text-left"
                    onClick={() => toggleCard(card.key)}
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-butter to-peach text-rosewood shadow-soft">
                        <ShoppingBasket size={20} />
                      </span>
                      <span>
                        <span className="block text-lg font-semibold">{card.title}</span>
                        <span className="mt-1 block text-xs text-cocoa/55">
                          {card.checkedCount}/{card.items.length} malzeme alındı
                        </span>
                      </span>
                    </span>
                    <ChevronDown
                      className={`shrink-0 text-cocoa/45 transition ${isOpen ? "rotate-180" : ""}`}
                      size={20}
                    />
                  </button>

                  {isOpen ? (
                    <div className="border-t border-rosewood/10 px-3 pb-3">
                      {groupByAisle(card.items).map(([aisle, groups]) => (
                        <div key={aisle} className="pt-3">
                          <p className="px-2 text-xs font-black uppercase tracking-[0.16em] text-sage">{aisle}</p>
                          {groups.map((group) => (
                            <label key={group.key} className="flex items-center gap-3 rounded-2xl px-2 py-3">
                              <input
                                type="checkbox"
                                className="h-5 w-5 rounded border-rosewood/30 accent-rosewood"
                                checked={group.is_checked}
                                onChange={() => void toggleGroup(group)}
                              />
                              <IngredientIcon name={group.name} size="sm" />
                              <span className={group.is_checked ? "text-cocoa/45 line-through" : ""}>
                                <span className="font-semibold">{group.name}</span>
                                <span className="ml-2 text-sm text-cocoa/60">
                                  {[group.amount, group.unit].filter(Boolean).join(" ")}
                                </span>
                              </span>
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState title="Liste boş" description="Bir tarif detayından malzemeleri alışveriş listesine ekleyebilirsin." />
        )}
      </section>
    </AuthGate>
  );
}

function groupByAisle(items: GroupedItem[]) {
  const order = ["Sebze & meyve", "Süt ürünleri", "Et & protein", "Kuru gıda", "Baharat & sos", "Diğer"];
  const map = new Map<string, GroupedItem[]>();

  for (const item of items) {
    map.set(item.aisle, [...(map.get(item.aisle) ?? []), item]);
  }

  return Array.from(map.entries()).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
}

function getAisle(name: string) {
  const text = name.toLocaleLowerCase("tr-TR");
  if (/(domates|salatalık|kabak|patates|havuç|soğan|biber|roka|marul|maydanoz|limon|elma|muz|meyve|sebze)/.test(text)) {
    return "Sebze & meyve";
  }
  if (/(peynir|süt|yoğurt|krema|tereyağı|kaymak|cheddar|kaşar|lor)/.test(text)) return "Süt ürünleri";
  if (/(tavuk|et|kıyma|köfte|balık|yumurta|protein)/.test(text)) return "Et & protein";
  if (/(un|pirinç|makarna|bulgur|mercimek|nohut|fasulye|şeker|yulaf|ekmek)/.test(text)) return "Kuru gıda";
  if (/(tuz|karabiber|pul biber|kimyon|zerdeçal|sos|salça|yağ|zeytinyağı|sirke|baharat)/.test(text)) return "Baharat & sos";
  return "Diğer";
}
