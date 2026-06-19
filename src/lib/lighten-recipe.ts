import { lightenRecipeResultSchema } from "@/lib/validation";
import type { LightenRecipeResult } from "@/lib/types";

type LightenRecipeInput = {
  title: string;
  category?: string | null;
  servings?: string | null;
  cooking_time?: string | null;
  notes?: string | null;
  ingredients: Array<{
    name: string;
    amount?: string | null;
    unit?: string | null;
  }>;
  steps: Array<{
    step_order?: number | null;
    description: string;
  }>;
};

export async function lightenRecipe(input: LightenRecipeInput): Promise<LightenRecipeResult> {
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
                "Sen saglikli tarif donusturme asistanisin. Verilen tarifi daha hafif, daha dengeli ve uygulanabilir hale getir. Lezzeti tamamen bozacak oneriler verme. Kesin kalori dususu bilmiyorsan net rakam uydurma. Kisa, pratik ve kullanici dostu yaz. Sadece JSON dondur."
            }
          ]
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Bu tarifi hafiflet.

JSON formati:
{
  "suggestions": [
    {
      "original": string,
      "replacement": string,
      "reason": string,
      "calorie_impact": string
    }
  ],
  "lighter_version_steps": string[],
  "summary": string
}

Kurallar:
- En fazla 5 net öneri ver.
- Yag, seker, kizartma, sos, hamur, porsiyon gibi hafifletilebilir yerleri bul.
- Olcu bilinmiyorsa kesin kalori farki yazma.
- Daha hafif yapilis adimlarini kisa yaz.
- Teknik dil kullanma.

Tarif:
${JSON.stringify(input)}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.15,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) throw new Error(`Tarif hafifletilemedi. Hata kodu: ${response.status}`);

  const payload = await response.json();
  const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("Hafifletme cevabi bos geldi.");

  return parseLightenJson(raw);
}

function parseLightenJson(raw: string): LightenRecipeResult {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const json = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;

  return lightenRecipeResultSchema.parse(JSON.parse(json));
}
