import { z } from "zod";

const nullableString = z.preprocess((value) => value ?? "", z.string());
const confidenceNumber = z.preprocess((value) => value ?? 0, z.coerce.number().min(0).max(1));
const evidenceSourceSchema = z.enum(["caption", "video_text", "visual", "inferred"]).default("inferred");
const imageUrlSchema = z
  .string()
  .refine((value) => !value || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:image/"), {
    message: "Geçerli bir görsel adresi olmalı."
  });

const recipeStepSchema = z.union([
  z.string().min(1),
  z.object({
    order: z.coerce.number().int().positive(),
    description: z.string().min(1),
    source: evidenceSourceSchema,
    confidence: confidenceNumber
  })
]);

export const recipeNutritionSchema = z.object({
  total_calories: z.coerce.number().int().nonnegative().default(0),
  calories_per_serving: z.coerce.number().int().nonnegative().default(0),
  protein_g: z.coerce.number().nonnegative().default(0),
  carbs_g: z.coerce.number().nonnegative().default(0),
  fat_g: z.coerce.number().nonnegative().default(0),
  confidence: confidenceNumber.default(0),
  nutrition_note: nullableString.default("")
});

export const lightenRecipeResultSchema = z.object({
  suggestions: z
    .array(
      z.object({
        original: nullableString.default(""),
        replacement: nullableString.default(""),
        reason: nullableString.default(""),
        calorie_impact: nullableString.default("")
      })
    )
    .default([]),
  lighter_version_steps: z.array(nullableString).default([]),
  summary: nullableString.default("")
});

export const extractedRecipeSchema = z.object({
  title: z.string().min(1),
  category: nullableString.default("Genel"),
  servings: nullableString.default(""),
  cooking_time: nullableString.default(""),
  image_url: imageUrlSchema.optional().or(z.literal("")),
  nutrition: recipeNutritionSchema.optional(),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1),
        amount: nullableString.default(""),
        unit: nullableString.default(""),
        source: evidenceSourceSchema,
        confidence: confidenceNumber
      })
    )
    .min(1),
  steps: z.array(recipeStepSchema).min(1),
  notes: nullableString.default(""),
  assumption_note: nullableString.default(""),
  overall_confidence: confidenceNumber.default(0),
  source_summary: z
    .object({
      caption_used: z.boolean().default(false),
      video_used: z.boolean().default(false),
      transcript_used: z.boolean().default(false)
    })
    .default({
      caption_used: false,
      video_used: false,
      transcript_used: false
    })
});

export const urlRequestSchema = z.object({
  url: z.string().url(),
  manualText: z.string().optional()
});

export const saveRecipeSchema = z.object({
  source_url: z.string().url(),
  recipe: extractedRecipeSchema
});

export const shoppingListSchema = z.object({
  recipe_id: z.string().uuid()
});
