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
                "Sen Serra'nın Tarif Defteri içinde çalışan sıcak, pratik ve güvenilir bir yemek asistanısın. Kullanıcıya kısa, uygulanabilir, ev mutfağına uygun öneriler ver. Vegan mod açıksa hayvansal ürün önerme. Yanıt sadece JSON olsun."
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
                      ? "Evdeki malzemelerle yemek öner"
                      : input.mode === "today"
                        ? "Bugün ne pişirsek önerisi üret"
                        : "7 günlük pratik haftalık menü üret",
                  ...input
                })
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.45,
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      })
    }
  );

  if (!response.ok) return fallbackAssistantResult(input);

  const payload = await response.json();
  const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return fallbackAssistantResult(input);

  try {
    return normalizeResult(JSON.parse(raw));
  } catch {
    return fallbackAssistantResult(input);
  }
}

function normalizeResult(value: Partial<MealAssistantResult>): MealAssistantResult {
  return {
    title: value.title || "Bugünün mutfak fikri",
    summary: value.summary || "Elindeki bilgilere göre pratik öneriler hazırladım.",
    suggestions: (value.suggestions ?? []).slice(0, 7).map((suggestion) => ({
      title: suggestion.title || "Pratik tarif",
      reason: suggestion.reason || "Bugün için uygun görünüyor.",
      time: suggestion.time || "25 dakika",
      ingredients: suggestion.ingredients ?? [],
      steps: suggestion.steps ?? [],
      tags: suggestion.tags ?? []
    })),
    shopping_focus: value.shopping_focus ?? [],
    serra_note: value.serra_note || "Aşkım, bunu evdeki tempoya göre kolayca uyarlayabiliriz."
  };
}

function fallbackAssistantResult(input: MealAssistantRequest): MealAssistantResult {
  const pantry = input.pantry
    .split(/[,.\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
  const baseIngredients = pantry.length ? pantry : input.vegan_mode ? ["sebze", "bakliyat", "zeytinyağı"] : ["yumurta", "peynir", "sebze"];

  return {
    title:
      input.mode === "weekly"
        ? "Bu haftanın pratik menüsü"
        : input.mode === "pantry"
          ? "Dolaptan çıkan fikirler"
          : "Bugün ne pişirsek?",
    summary: input.vegan_mode
      ? "Vegan moda uygun, pratik ve hafif öneriler hazırladım."
      : "Pratik, evde uygulanabilir ve az uğraştıran öneriler hazırladım.",
    suggestions: Array.from({ length: input.mode === "weekly" ? 7 : 3 }, (_, index) => ({
      title:
        input.mode === "weekly"
          ? `${index + 1}. gün: ${input.vegan_mode ? "Sebzeli kase" : "Pratik ev yemeği"}`
          : `${input.vegan_mode ? "Bitkisel" : "Pratik"} ${baseIngredients[0]} tabağı`,
      reason: "Malzemesi kolay, hızlı hazırlanır ve günlük kullanıma uygun.",
      time: input.max_minutes ? `${input.max_minutes} dakika içinde` : "25-35 dakika",
      ingredients: baseIngredients,
      steps: ["Malzemeleri hazırla.", "Ana malzemeyi pişir veya sotele.", "Baharat ve sosla tamamlayıp servis et."],
      tags: input.vegan_mode ? ["vegan", "pratik"] : ["pratik", "ev yemeği"]
    })),
    shopping_focus: input.vegan_mode ? ["yeşillik", "bakliyat", "taze sebze"] : ["taze sebze", "yoğurt", "protein"],
    serra_note: "Aşkım, bunu damak zevkine göre kolayca değiştirebiliriz."
  };
}
