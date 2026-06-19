import { recipeNutritionSchema } from "@/lib/validation";
import type { RecipeNutrition } from "@/lib/types";

type NutritionIngredient = {
  name: string;
  amount?: string | null;
  unit?: string | null;
};

type NutritionStep = {
  step_order?: number | null;
  description: string;
};

type NutritionRecipeInput = {
  title: string;
  category?: string | null;
  servings?: string | null;
  cooking_time?: string | null;
  notes?: string | null;
  ingredients: NutritionIngredient[];
  steps?: NutritionStep[];
};

export async function calculateRecipeNutrition(recipe: NutritionRecipeInput): Promise<RecipeNutrition> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) throw new Error("GEMINI_API_KEY eksik.");

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
                "Sen bir tarif besin degeri analiz motorusun. Malzeme, miktar ve porsiyon bilgisinden yaklasik kalori ve makro hesapla. Kesin olmayan degerlerde confidence dusuk olsun ve nutrition_note icinde tahmini oldugunu belirt. Sadece JSON dondur."
            }
          ]
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Tarif besin degerini hesapla.

JSON formati:
{
  "total_calories": number,
  "calories_per_serving": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "confidence": number,
  "nutrition_note": string
}

Tarif:
${JSON.stringify(recipe)}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.05,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Kalori hesaplanamadi. Hata kodu: ${response.status}`);
  }

  const payload = await response.json();
  const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("Kalori hesabi bos geldi.");

  return parseNutritionJson(raw);
}

function parseNutritionJson(raw: string): RecipeNutrition {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const json = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;

  return recipeNutritionSchema.parse(JSON.parse(json));
}
