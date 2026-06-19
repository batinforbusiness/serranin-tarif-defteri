import { extractedRecipeSchema } from "@/lib/validation";
import type { ExtractorRecipe } from "@/lib/extraction/types";

export const RECIPE_ENGINE_ROLE = `Sen yemek videosu analiz eden bir tarif çıkarma motorusun.
Görevin açıklama, ekrandaki yazılar ve videoda görünen yemek hazırlama adımlarını birleştirerek uygulanabilir bir tarif kartı üretmek.
Açıklamada yazan ölçüler varsa aynen koru.
Emin olmadığın ölçüleri uydurma. Ancak videoda sayılabilen parçalar net görünüyorsa adet bilgisini yaz: örneğin 2 dilim peynir, 1 yumurta, 3 lavaş.
Ölçü net değilse amount ve unit boş kalsın.
Aynı malzemeyi iki kez yazma. Malzemeleri sade adlarla normalize et.
Adımları videoda görünen eylemlerden çıkar: serme, koyma, kapatma, pişirme, çevirme, kesme, servis gibi.
Adımları kısa, net ve uygulanabilir yaz. "Tarif adımı bulunamadı" gibi açıklama yazma. Gereksiz AI dili kullanma.
Yanıt yalnızca geçerli JSON olsun.`;

export const enrichedRecipeResponseSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    category: { type: "STRING" },
    servings: { type: "STRING" },
    cooking_time: { type: "STRING" },
    nutrition: {
      type: "OBJECT",
      properties: {
        total_calories: { type: "NUMBER" },
        calories_per_serving: { type: "NUMBER" },
        protein_g: { type: "NUMBER" },
        carbs_g: { type: "NUMBER" },
        fat_g: { type: "NUMBER" },
        confidence: { type: "NUMBER" },
        nutrition_note: { type: "STRING" }
      },
      required: [
        "total_calories",
        "calories_per_serving",
        "protein_g",
        "carbs_g",
        "fat_g",
        "confidence",
        "nutrition_note"
      ]
    },
    ingredients: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          amount: { type: "STRING" },
          unit: { type: "STRING" },
          source: { type: "STRING", enum: ["caption", "video_text", "visual", "inferred"] },
          confidence: { type: "NUMBER" }
        },
        required: ["name", "amount", "unit", "source", "confidence"]
      }
    },
    steps: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          order: { type: "NUMBER" },
          description: { type: "STRING" },
          source: { type: "STRING", enum: ["caption", "video_text", "visual", "inferred"] },
          confidence: { type: "NUMBER" }
        },
        required: ["order", "description", "source", "confidence"]
      }
    },
    notes: { type: "STRING" },
    assumption_note: { type: "STRING" },
    overall_confidence: { type: "NUMBER" },
    source_summary: {
      type: "OBJECT",
      properties: {
        caption_used: { type: "BOOLEAN" },
        video_used: { type: "BOOLEAN" },
        transcript_used: { type: "BOOLEAN" }
      },
      required: ["caption_used", "video_used", "transcript_used"]
    }
  },
  required: [
    "title",
    "category",
    "servings",
    "cooking_time",
    "nutrition",
    "ingredients",
    "steps",
    "notes",
    "assumption_note",
    "overall_confidence",
    "source_summary"
  ]
};

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export async function generateGeminiRecipe(parts: GeminiPart[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) throw new Error("GEMINI_API_KEY eksik.");

  const finalResponse = await callGeminiWithFallbacks({
    apiKey,
    models: getGeminiModels(model),
    parts
  });

  if (!finalResponse.ok) {
    const detail = await finalResponse.text();
    console.error("Gemini recipe extraction failed", {
      status: finalResponse.status,
      statusText: finalResponse.statusText,
      detail: detail.slice(0, 1000)
    });
    throw new Error(getGeminiErrorMessage(finalResponse.status, detail));
  }

  const payload = await finalResponse.json();
  const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("Gemini yanıtı boş geldi.");

  return parseRecipeJson(raw);
}

async function callGeminiWithFallbacks(input: {
  apiKey: string;
  models: string[];
  parts: GeminiPart[];
}) {
  let lastResponse: Response | null = null;

  for (const model of input.models) {
    const schemaResponse = await callGeminiWithRetry({
      apiKey: input.apiKey,
      model,
      parts: input.parts,
      useSchema: true
    });

    if (schemaResponse.ok) return schemaResponse;
    lastResponse = schemaResponse;

    if (schemaResponse.status === 400) {
      const plainResponse = await callGeminiWithRetry({
        apiKey: input.apiKey,
        model,
        parts: input.parts,
        useSchema: false
      });

      if (plainResponse.ok) return plainResponse;
      lastResponse = plainResponse;
    }

    if (schemaResponse.status === 403) break;
  }

  if (!lastResponse) throw new Error("Gemini yanıtı alınamadı.");
  return lastResponse;
}

async function callGeminiWithRetry(input: {
  apiKey: string;
  model: string;
  parts: GeminiPart[];
  useSchema: boolean;
}) {
  const retryStatuses = new Set([429, 500, 502, 503, 504]);
  let response = await callGemini(input);

  for (const delay of [900, 1800, 3200]) {
    if (!retryStatuses.has(response.status)) return response;
    await sleep(delay);
    response = await callGemini(input);
  }

  return response;
}

function callGemini(input: {
  apiKey: string;
  model: string;
  parts: GeminiPart[];
  useSchema: boolean;
}) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent?key=${input.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: RECIPE_ENGINE_ROLE }]
        },
        contents: [{ role: "user", parts: input.parts }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          ...(input.useSchema ? { responseSchema: enrichedRecipeResponseSchema } : {})
        }
      })
    }
  );
}

function getGeminiModels(primaryModel: string) {
  return Array.from(
    new Set([
      primaryModel,
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash",
      "gemini-1.5-flash"
    ])
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getGeminiErrorMessage(status: number, detail: string) {
  const lowerDetail = detail.toLowerCase();

  if (status === 400 && lowerDetail.includes("api key")) {
    return "Gemini API anahtarı geçersiz görünüyor. Google AI Studio'dan yeni bir API key oluşturup .env.local içine koy.";
  }
  if (status === 400 && lowerDetail.includes("response_schema")) {
    return "Gemini JSON şemasını kabul etmedi. Model ayarı güncellenmeli.";
  }
  if (status === 400 && lowerDetail.includes("model")) {
    return "Seçili Gemini modeli bu istek için uygun değil. GEMINI_MODEL değerini kontrol et.";
  }
  if (status === 403) return "Gemini API erişimi reddedildi. API key, proje yetkisi veya faturalandırma ayarını kontrol et.";
  if (status === 404) return "Gemini modeli bulunamadı. .env.local içindeki GEMINI_MODEL değerini kontrol et.";
  if (status === 429) return "Gemini kullanım limiti dolmuş. Biraz bekleyip tekrar dene.";
  if (status === 503) return "Gemini geçici olarak yoğun veya erişilemez durumda. Biraz sonra tekrar dene.";

  return `Gemini tarif çıktısı üretemedi. Hata kodu: ${status}`;
}

export function parseRecipeJson(raw: string): ExtractorRecipe {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return parseLenientRecipe(JSON.parse(cleaned));
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start >= 0 && end > start) {
      return parseLenientRecipe(JSON.parse(cleaned.slice(start, end + 1)));
    }

    throw new Error("AI tarif bilgisini JSON formatında döndüremedi.");
  }
}

function parseLenientRecipe(value: unknown): ExtractorRecipe {
  const recipe = value as {
    title?: unknown;
    ingredients?: unknown;
    steps?: unknown;
    notes?: unknown;
    assumption_note?: unknown;
  };

  if (Array.isArray(recipe.ingredients) && recipe.ingredients.length === 0) {
    recipe.ingredients = [
      {
        name: "malzeme",
        amount: "",
        unit: "",
        source: "inferred",
        confidence: 0.1
      }
    ];
  }

  if (Array.isArray(recipe.steps) && recipe.steps.length === 0) {
    recipe.steps = [
      {
        order: 1,
        description: "Yapılış adımları videoda yeterince net çıkarılamadı.",
        source: "inferred",
        confidence: 0.1
      }
    ];
    recipe.assumption_note = [recipe.assumption_note, "Yapılış adımları net olmadığı için yeniden deneme gerekebilir."]
      .filter(Boolean)
      .join(" ");
  }

  return extractedRecipeSchema.parse(recipe);
}
