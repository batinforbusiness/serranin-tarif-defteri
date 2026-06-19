import { extractedRecipeSchema } from "@/lib/validation";

const SYSTEM_PROMPT = `Sen bir tarif düzenleme asistanısın. Sana verilen web sayfası veya manuel tarif metninden temiz ve uygulanabilir tarif çıkar.
Yanıtın yalnızca geçerli JSON olsun. Markdown, açıklama ve kod bloğu kullanma.
JSON alanları: title, category, servings, cooking_time, ingredients, steps, notes.
ingredients dizisinde name, amount, unit alanları string olmalı.`;

export async function extractRecipeWithAI(input: { url: string; content: string }) {
  if (process.env.GEMINI_API_KEY) {
    return extractRecipeWithGemini(input);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY veya OPENAI_API_KEY eksik.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Kaynak URL: ${input.url}\n\nTarif içeriği:\n${input.content.slice(0, 12000)}`
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error("OpenAI tarif çıktısı üretemedi.");
  }

  const payload = await response.json();
  const raw = payload.choices?.[0]?.message?.content;
  if (!raw) throw new Error("AI yanıtı boş geldi.");

  return extractedRecipeSchema.parse(parseAiJson(raw));
}

async function extractRecipeWithGemini(input: { url: string; content: string }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY eksik.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Kaynak URL: ${input.url}\n\nTarif içeriği:\n${input.content.slice(0, 12000)}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              category: { type: "STRING" },
              servings: { type: "STRING" },
              cooking_time: { type: "STRING" },
              ingredients: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    amount: { type: "STRING" },
                    unit: { type: "STRING" }
                  },
                  required: ["name", "amount", "unit"]
                }
              },
              steps: {
                type: "ARRAY",
                items: { type: "STRING" }
              },
              notes: { type: "STRING" }
            },
            required: ["title", "category", "servings", "cooking_time", "ingredients", "steps", "notes"]
          }
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error("Gemini tarif çıktısı üretemedi.");
  }

  const payload = await response.json();
  const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("Gemini yanıtı boş geldi.");

  return extractedRecipeSchema.parse(parseAiJson(raw));
}

function parseAiJson(raw: string) {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        // Fall through to the friendly error below.
      }
    }

    throw new Error("AI tarif bilgisini JSON formatında döndüremedi. Link yerine tarif metnini manuel yapıştırmayı dene.");
  }
}
