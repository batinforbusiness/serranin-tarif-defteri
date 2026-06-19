type VeganIngredient = {
  name?: string | null;
};

export type VeganCheckRecipe = {
  title?: string | null;
  category?: string | null;
  recipe_ingredients?: VeganIngredient[] | null;
};

const animalKeywords = [
  "tavuk",
  "hindi",
  "et",
  "etli",
  "dana",
  "kuzu",
  "kıyma",
  "köfte",
  "burger köftesi",
  "sucuk",
  "sosis",
  "pastırma",
  "jambon",
  "balık",
  "ton balığı",
  "somon",
  "karides",
  "kalamar",
  "yumurta",
  "peynir",
  "cheddar",
  "kaşar",
  "lor",
  "süt",
  "sütlü",
  "yoğurt",
  "krema",
  "tereyağı",
  "kaymak",
  "bal",
  "mayonez"
];

const positiveVeganWords = ["vegan", "bitkisel", "etsiz", "sütsüz", "yumurtasız"];

export function isLikelyVeganRecipe(recipe: VeganCheckRecipe) {
  const textParts = [
    recipe.title ?? "",
    recipe.category ?? "",
    ...(recipe.recipe_ingredients ?? []).map((ingredient) => ingredient.name ?? "")
  ];
  const normalized = ` ${textParts.join(" ").toLocaleLowerCase("tr-TR")} `;

  const hasAnimalIngredient = animalKeywords.some((keyword) => normalized.includes(` ${keyword} `));
  if (hasAnimalIngredient) return false;

  const hasIngredients = Boolean(recipe.recipe_ingredients?.length);
  if (hasIngredients) return true;

  return positiveVeganWords.some((keyword) => normalized.includes(keyword));
}
