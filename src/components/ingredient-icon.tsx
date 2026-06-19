"use client";

import {
  Apple,
  Bean,
  Beef,
  Carrot,
  Cookie,
  Croissant,
  Drumstick,
  Egg,
  Fish,
  GlassWater,
  LeafyGreen,
  Milk,
  Package,
  Salad,
  Sandwich,
  Soup,
  Wheat,
  type LucideIcon
} from "lucide-react";

type IconRecipe = {
  icon: LucideIcon;
  className: string;
  keywords: string[];
};

const iconRecipes: IconRecipe[] = [
  { icon: Carrot, className: "from-orange-200 via-orange-100 to-lime-100 text-orange-700", keywords: ["havuç", "carrot"] },
  { icon: Egg, className: "from-yellow-100 via-white to-orange-100 text-yellow-700", keywords: ["yumurta", "egg"] },
  { icon: Beef, className: "from-red-200 via-rose-100 to-orange-100 text-red-800", keywords: ["köfte", "kıyma", "et", "burger", "beef"] },
  { icon: Milk, className: "from-sky-100 via-white to-blue-100 text-sky-700", keywords: ["peynir", "süt", "yoğurt", "krema", "cheese", "milk"] },
  { icon: Wheat, className: "from-amber-200 via-yellow-100 to-orange-100 text-amber-800", keywords: ["un", "pirinç", "bulgur", "makarna", "kağıdı", "ekmek", "wheat"] },
  { icon: LeafyGreen, className: "from-emerald-200 via-lime-100 to-green-100 text-emerald-700", keywords: ["roka", "marul", "maydanoz", "dereotu", "nane", "yeşil"] },
  { icon: Salad, className: "from-lime-200 via-green-100 to-yellow-100 text-lime-800", keywords: ["salatalık", "domates", "biber", "sebze", "kabak"] },
  { icon: Soup, className: "from-red-100 via-orange-100 to-yellow-100 text-rosewood", keywords: ["sos", "salça", "hardal", "ketçap", "mayonez"] },
  { icon: GlassWater, className: "from-cyan-100 via-blue-50 to-white text-cyan-700", keywords: ["su", "sıvı", "yağ", "zeytinyağı"] },
  { icon: Fish, className: "from-blue-100 via-cyan-100 to-teal-100 text-blue-700", keywords: ["balık", "somon", "ton"] },
  { icon: Drumstick, className: "from-orange-200 via-rose-100 to-yellow-100 text-orange-800", keywords: ["tavuk", "hindi"] },
  { icon: Cookie, className: "from-stone-200 via-amber-100 to-yellow-100 text-stone-700", keywords: ["şeker", "kakao", "çikolata", "bisküvi"] },
  { icon: Bean, className: "from-amber-200 via-orange-100 to-red-100 text-amber-900", keywords: ["fasulye", "nohut", "mercimek", "susam"] },
  { icon: Apple, className: "from-red-200 via-pink-100 to-yellow-100 text-red-700", keywords: ["elma", "meyve", "limon"] },
  { icon: Croissant, className: "from-yellow-200 via-amber-100 to-orange-100 text-amber-800", keywords: ["hamur", "poğaça", "börek"] },
  { icon: Sandwich, className: "from-yellow-100 via-lime-100 to-orange-100 text-orange-700", keywords: ["sandviç", "tost"] }
];

export function IngredientIcon({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const normalized = name.toLocaleLowerCase("tr-TR");
  const recipe = iconRecipes.find((item) => item.keywords.some((keyword) => normalized.includes(keyword))) ?? {
    icon: Package,
    className: "from-fuchsia-100 via-rose-100 to-amber-100 text-rosewood"
  };
  const Icon = recipe.icon;
  const boxSize = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const iconSize = size === "sm" ? 17 : 20;

  return (
    <span
      className={`relative inline-flex ${boxSize} shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${recipe.className} shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_22px_rgba(82,57,42,0.14)]`}
    >
      <span className="absolute left-2 top-1 h-2 w-2 rounded-full bg-white/75" />
      <Icon size={iconSize} strokeWidth={2.3} />
    </span>
  );
}
