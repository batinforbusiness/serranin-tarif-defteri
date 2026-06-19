import { z } from "zod";

export const mealAssistantRequestSchema = z.object({
  mode: z.enum(["pantry", "today", "weekly"]),
  pantry: z.string().optional().default(""),
  mood: z.string().optional().default(""),
  max_minutes: z.coerce.number().int().positive().max(240).optional(),
  preferences: z.array(z.string()).optional().default([]),
  vegan_mode: z.boolean().optional().default(false)
});

export type MealAssistantRequest = z.infer<typeof mealAssistantRequestSchema>;

export type MealAssistantResult = {
  title: string;
  summary: string;
  suggestions: Array<{
    title: string;
    reason: string;
    time: string;
    image_url?: string;
    ingredients: string[];
    steps: string[];
    tags: string[];
  }>;
  shopping_focus: string[];
  serra_note: string;
};

const responseSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    summary: { type: "STRING" },
    suggestions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          reason: { type: "STRING" },
          time: { type: "STRING" },
          image_url: { type: "STRING" },
          ingredients: { type: "ARRAY", items: { type: "STRING" } },
          steps: { type: "ARRAY", items: { type: "STRING" } },
          tags: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["title", "reason", "time", "ingredients", "steps", "tags"]
      }
    },
    shopping_focus: { type: "ARRAY", items: { type: "STRING" } },
    serra_note: { type: "STRING" }
  },
  required: ["title", "summary", "suggestions", "shopping_focus", "serra_note"]
};

export async function generateMealAssistantResult(input: MealAssistantRequest): Promise<MealAssistantResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) return fallbackAssistantResult(input);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                "Sen Serra'nin Tarif Defteri icinde calisan guvenilir bir yemek onerme motorusun. Genel yemek bilgisini, ev mutfagi pratiklerini ve kullanicinin secili malzemelerini birlikte kullan. Ayni oneriyi tekrar etme. Uydurma internet kaynagi veya gorsel URL verme. Vegan mod aciksa hayvansal urun onerme. Tarifler kisa, uygulanabilir ve olculu olsun. Yanit sadece JSON olsun."
            }
          ]
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: JSON.stringify({
                  hedef:
                    input.mode === "pantry"
                      ? "Evdeki secili malzemelerle farkli yemek onerileri uret. Secili malzemeleri ana karar verici olarak kullan."
                      : input.mode === "today"
                        ? "Bugun icin birbirinden farkli pratik yemek onerileri uret."
                        : "7 gunluk birbirini tekrar etmeyen pratik haftalik menu uret.",
                  kalite_kurallari: [
                    "Ayni basligi veya ayni adimlari tekrar etme.",
                    "Oneriler kullanicinin dakika sinirina uysun.",
                    "Malzeme yoksa genel ama mantikli oneriler ver.",
                    "Somut tarif adi yaz, belirsiz kategori adi yazma.",
                    "Gorsel URL uydurma; image_url bos kalabilir."
                  ],
                  ...input
                })
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.65,
          responseMimeType: "application/json",
          responseSchema
        }
      })
    }
  );

  if (!response.ok) return fallbackAssistantResult(input);

  const payload = await response.json();
  const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return fallbackAssistantResult(input);

  try {
    return normalizeResult(JSON.parse(raw), input);
  } catch {
    return fallbackAssistantResult(input);
  }
}

function normalizeResult(value: Partial<MealAssistantResult>, input: MealAssistantRequest): MealAssistantResult {
  const seen = new Set<string>();
  const suggestions = (value.suggestions ?? [])
    .filter((suggestion) => {
      const key = (suggestion.title || "").toLocaleLowerCase("tr-TR").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, input.mode === "weekly" ? 7 : 4)
    .map((suggestion) => ({
      title: suggestion.title || "Pratik tarif",
      reason: suggestion.reason || "Bugun icin uygun gorunuyor.",
      time: suggestion.time || (input.max_minutes ? `${input.max_minutes} dakika` : "25 dakika"),
      image_url: cleanImageUrl(suggestion.image_url) || foodSearchImageUrl(suggestion.title || "pratik yemek"),
      ingredients: Array.from(new Set(suggestion.ingredients ?? [])).slice(0, 8),
      steps: (suggestion.steps ?? []).filter(Boolean).slice(0, 6),
      tags: Array.from(new Set(suggestion.tags ?? [])).slice(0, 5)
    }));

  return {
    title: value.title || defaultTitle(input),
    summary: value.summary || "Elindeki bilgilere gore pratik oneriler hazirladim.",
    suggestions: suggestions.length ? suggestions : fallbackAssistantResult(input).suggestions,
    shopping_focus: [],
    serra_note: value.serra_note || "Askim, bunu damak zevkine gore kolayca uyarlayabiliriz."
  };
}

function fallbackAssistantResult(input: MealAssistantRequest): MealAssistantResult {
  const pantry = input.pantry
    .split(/[,.\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
  const baseIngredients = pantry.length ? pantry : input.vegan_mode ? ["sebze", "mercimek", "zeytinyagi"] : ["yumurta", "peynir", "sebze"];
  const suggestions = buildFallbackSuggestions(input, baseIngredients);

  return {
    title: defaultTitle(input),
    summary: input.vegan_mode
      ? "Vegan moda uygun, pratik ve hafif oneriler hazirladim."
      : "Pratik, evde uygulanabilir ve az ugrastiran oneriler hazirladim.",
    suggestions,
    shopping_focus: [],
    serra_note: "Askim, bunu damak zevkine gore kolayca degistirebiliriz."
  };
}

function defaultTitle(input: MealAssistantRequest) {
  if (input.mode === "weekly") return "Bu haftanin pratik menusu";
  if (input.mode === "pantry") return "Dolaptan cikan fikirler";
  return "Bugun ne pisirsek?";
}

function buildFallbackSuggestions(input: MealAssistantRequest, baseIngredients: string[]): MealAssistantResult["suggestions"] {
  const minutes = input.max_minutes ? `${input.max_minutes} dakika icinde` : "25-35 dakika";
  const pantryMain = baseIngredients[0] || "sebze";
  const pantrySecond = baseIngredients[1] || (input.vegan_mode ? "mercimek" : "yogurt");
  const pantryThird = baseIngredients[2] || (input.vegan_mode ? "nohut" : "yumurta");

  if (input.mode === "weekly") {
    const weekly = input.vegan_mode
      ? ["Mercimekli sebze corbasi", "Nohutlu renkli salata", "Zeytinyagli makarna", "Sebzeli pirinc kasesi", "Firin patates ve yesillik", "Bulgurlu kabak yemegi", "Mantarli wrap"]
      : ["Yogurtlu kofte tabagi", "Sebzeli omlet", "Tavuklu makarna", "Domatesli pirinc pilavi", "Peynirli tost ve salata", "Kabakli mucver", "Pratik firin patates"];

    return weekly.map((title, index) => ({
      title: `${index + 1}. gun: ${title}`,
      reason: "Haftalik planda birbirini tekrar etmeyen, evde uygulanabilir bir secenek.",
      time: minutes,
      image_url: foodSearchImageUrl(title),
      ingredients: Array.from(new Set([pantryMain, pantrySecond, pantryThird])).slice(0, 5),
      steps: ["Ana malzemeleri hazirla.", "Uygun pisirme yontemiyle pisir.", "Yanina salata veya yogurt gibi tamamlayici ekle."],
      tags: input.vegan_mode ? ["vegan", "haftalik"] : ["haftalik", "pratik"]
    }));
  }

  const titles = input.vegan_mode
    ? [`${pantryMain} ile sicak sebze kasesi`, `${pantrySecond} salatasi`, `${pantryThird} destekli pratik tabak`]
    : [`${pantryMain} ve ${pantrySecond} tabagi`, `${pantryThird} ile pratik tava`, `${pantryMain} destekli doyurucu kase`];

  return titles.map((title, index) => ({
    title,
    reason: index === 0 ? "Secili malzemeleri merkezine alir ve hizli hazirlanir." : "Ayni malzemelerle farkli bir doku ve sunum verir.",
    time: minutes,
    image_url: foodSearchImageUrl(title),
    ingredients: Array.from(new Set(baseIngredients)).slice(0, 6),
    steps: ["Malzemeleri dogra ve hazirla.", "Ana malzemeyi pisir veya sotele.", "Baharat, sos ve taze dokunusla servis et."],
    tags: input.vegan_mode ? ["vegan", "pratik"] : ["pratik", "ev yemegi"]
  }));
}

function cleanImageUrl(value: unknown) {
  if (typeof value !== "string") return "";
  if (!value.startsWith("https://")) return "";
  return value;
}

function foodSearchImageUrl(title: string) {
  const query = encodeURIComponent(`${title} food recipe`);
  return `https://source.unsplash.com/900x700/?${query}`;
}
