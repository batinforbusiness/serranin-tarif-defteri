"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Clock,
  Flame,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  ShoppingBasket,
  SkipForward,
  Trash2,
  Users,
  Volume2,
  WandSparkles,
  X
} from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { IngredientIcon } from "@/components/ingredient-icon";
import { SafeImage } from "@/components/safe-image";
import { useAuth } from "@/components/auth-provider";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { calculateSerraScore } from "@/lib/serra-score";
import type { RecipeDetail, RecipeLightenSuggestionRow } from "@/lib/types";

type IngredientForm = {
  name: string;
  amount: string;
  unit: string;
};

type MetaForm = {
  category: string;
  cooking_time: string;
  servings: string;
};

export default function RecipeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingIngredient, setSavingIngredient] = useState(false);
  const [savingStep, setSavingStep] = useState(false);
  const [calculatingNutrition, setCalculatingNutrition] = useState(false);
  const [lighteningRecipe, setLighteningRecipe] = useState(false);
  const [refreshingImage, setRefreshingImage] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [metaDraft, setMetaDraft] = useState<MetaForm>({ category: "", cooking_time: "", servings: "" });
  const [ingredientDraft, setIngredientDraft] = useState<IngredientForm>({ name: "", amount: "", unit: "" });
  const [stepDraft, setStepDraft] = useState("");
  const [message, setMessage] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");
  const [autoImageTried, setAutoImageTried] = useState(false);
  const [autoNutritionTried, setAutoNutritionTried] = useState(false);
  const [ingredientForm, setIngredientForm] = useState<IngredientForm>({ name: "", amount: "", unit: "" });
  const [stepText, setStepText] = useState("");
  const [kitchenStepIndex, setKitchenStepIndex] = useState(0);

  const nextStepOrder = useMemo(() => {
    const lastStep = recipe?.recipe_steps.at(-1);
    return (lastStep?.step_order ?? 0) + 1;
  }, [recipe]);

  const serraScore = useMemo(() => (recipe ? calculateSerraScore(recipe) : null), [recipe]);

  const loadRecipe = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const response = await fetch(`/api/recipe-detail?id=${params.id}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });
    const payload = await response.json();
    let data = response.ok ? payload.recipe : null;
    let canEditValue = Boolean(payload.can_edit);

    if (!data) {
      const supabase = getBrowserSupabase();
      const fallback = await supabase
        .from("recipes")
        .select("*,recipe_ingredients(id,name,amount,unit),recipe_steps(id,step_order,description)")
        .eq("id", params.id)
        .maybeSingle();

      if (fallback.data) {
        data = {
          ...fallback.data,
          recipe_nutrition: [],
          recipe_lighten_suggestions: []
        };
        canEditValue = fallback.data.user_id === session.user.id;
      }
    }

    if (data) {
      const detail = data as RecipeDetail;
      detail.recipe_steps.sort((a, b) => a.step_order - b.step_order);
      setRecipe(detail);
      setCanEdit(canEditValue);
      setTitleDraft(detail.title);
      setMetaDraft({
        category: detail.category ?? "",
        cooking_time: detail.cooking_time ?? "",
        servings: detail.servings ?? ""
      });
    }
    setLoading(false);
  }, [params.id, session]);

  useEffect(() => {
    void loadRecipe();
  }, [loadRecipe]);

  useEffect(() => {
    if (!recipe || !session || recipe.image_url || autoImageTried) return;
    setAutoImageTried(true);
    void refreshRecipeImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe?.id, recipe?.image_url, session, autoImageTried]);

  useEffect(() => {
    if (!recipe || !session || recipe.recipe_nutrition?.[0] || autoNutritionTried) return;
    setAutoNutritionTried(true);
    void calculateNutrition({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe?.id, recipe?.recipe_nutrition, session, autoNutritionTried]);

  async function saveTitle() {
    if (!recipe) return;
    const title = titleDraft.trim();
    if (!title || title === recipe.title) {
      setTitleDraft(recipe.title);
      setEditingTitle(false);
      return;
    }

    setSavingTitle(true);
    setMessage("");
    const supabase = getBrowserSupabase();
    const { error } = await supabase.from("recipes").update({ title }).eq("id", recipe.id);
    if (error) {
      setMessage("Tarif adı kaydedilemedi.");
    } else {
      setRecipe({ ...recipe, title });
      setEditingTitle(false);
      setMessage("Tarif adı güncellendi.");
    }
    setSavingTitle(false);
  }

  async function saveMeta() {
    if (!recipe) return;
    setSavingMeta(true);
    setMessage("");
    const payload = {
      category: metaDraft.category.trim(),
      cooking_time: metaDraft.cooking_time.trim(),
      servings: metaDraft.servings.trim()
    };
    const supabase = getBrowserSupabase();
    const { error } = await supabase.from("recipes").update(payload).eq("id", recipe.id);
    if (error) {
      setMessage("Tarif bilgileri kaydedilemedi.");
    } else {
      setRecipe({ ...recipe, ...payload });
      setEditingMeta(false);
      setMessage("Tarif bilgileri güncellendi.");
    }
    setSavingMeta(false);
  }

  async function refreshRecipeImage() {
    if (!recipe || !session) return;
    setRefreshingImage(true);
    setPhotoMessage("");
    setMessage("");

    const response = await fetch("/api/refresh-recipe-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ recipe_id: recipe.id })
    });
    const payload = await response.json();

    if (response.ok) {
      setRecipe({ ...recipe, image_url: payload.image_url });
      setPhotoMessage("Fotoğraf eklendi.");
    } else {
      setPhotoMessage(payload.error ?? "Fotoğraf bulunamadı.");
    }
    setRefreshingImage(false);
  }

  async function addIngredient() {
    if (!recipe || !ingredientForm.name.trim()) return;
    setSavingIngredient(true);
    setMessage("");

    const supabase = getBrowserSupabase();
    const { data, error } = await supabase
      .from("recipe_ingredients")
      .insert({
        recipe_id: recipe.id,
        name: ingredientForm.name.trim(),
        amount: ingredientForm.amount.trim(),
        unit: ingredientForm.unit.trim()
      })
      .select("id,name,amount,unit")
      .single();

    if (error || !data) {
      setMessage("Malzeme eklenemedi.");
    } else {
      setRecipe({ ...recipe, recipe_ingredients: [...recipe.recipe_ingredients, data] });
      setIngredientForm({ name: "", amount: "", unit: "" });
      setMessage("Malzeme eklendi.");
    }
    setSavingIngredient(false);
  }

  function startIngredientEdit(ingredient: RecipeDetail["recipe_ingredients"][number]) {
    setEditingIngredientId(ingredient.id);
    setIngredientDraft({
      name: ingredient.name,
      amount: ingredient.amount ?? "",
      unit: ingredient.unit ?? ""
    });
  }

  async function updateIngredient(id: string) {
    if (!recipe || !ingredientDraft.name.trim()) return;
    setSavingIngredient(true);
    const payload = {
      name: ingredientDraft.name.trim(),
      amount: ingredientDraft.amount.trim(),
      unit: ingredientDraft.unit.trim()
    };
    const supabase = getBrowserSupabase();
    const { error } = await supabase.from("recipe_ingredients").update(payload).eq("id", id);
    if (error) {
      setMessage("Malzeme güncellenemedi.");
    } else {
      setRecipe({
        ...recipe,
        recipe_ingredients: recipe.recipe_ingredients.map((item) => (item.id === id ? { ...item, ...payload } : item))
      });
      setEditingIngredientId(null);
      setMessage("Malzeme güncellendi.");
    }
    setSavingIngredient(false);
  }

  async function deleteIngredient(id: string) {
    if (!recipe) return;
    const supabase = getBrowserSupabase();
    const { error } = await supabase.from("recipe_ingredients").delete().eq("id", id);
    if (error) {
      setMessage("Malzeme silinemedi.");
    } else {
      setRecipe({
        ...recipe,
        recipe_ingredients: recipe.recipe_ingredients.filter((item) => item.id !== id)
      });
      setMessage("Malzeme silindi.");
    }
  }

  async function addStep() {
    if (!recipe || !stepText.trim()) return;
    setSavingStep(true);
    setMessage("");

    const supabase = getBrowserSupabase();
    const { data, error } = await supabase
      .from("recipe_steps")
      .insert({
        recipe_id: recipe.id,
        step_order: nextStepOrder,
        description: stepText.trim()
      })
      .select("id,step_order,description")
      .single();

    if (error || !data) {
      setMessage("Adım eklenemedi.");
    } else {
      setRecipe({ ...recipe, recipe_steps: [...recipe.recipe_steps, data].sort((a, b) => a.step_order - b.step_order) });
      setStepText("");
      setMessage("Adım eklendi.");
    }
    setSavingStep(false);
  }

  function startStepEdit(step: RecipeDetail["recipe_steps"][number]) {
    setEditingStepId(step.id);
    setStepDraft(step.description);
  }

  async function updateStep(id: string) {
    if (!recipe || !stepDraft.trim()) return;
    setSavingStep(true);
    const description = stepDraft.trim();
    const supabase = getBrowserSupabase();
    const { error } = await supabase.from("recipe_steps").update({ description }).eq("id", id);
    if (error) {
      setMessage("Adım güncellenemedi.");
    } else {
      setRecipe({
        ...recipe,
        recipe_steps: recipe.recipe_steps.map((step) => (step.id === id ? { ...step, description } : step))
      });
      setEditingStepId(null);
      setMessage("Adım güncellendi.");
    }
    setSavingStep(false);
  }

  async function deleteStep(id: string) {
    if (!recipe) return;
    const supabase = getBrowserSupabase();
    const { error } = await supabase.from("recipe_steps").delete().eq("id", id);
    if (error) {
      setMessage("Adım silinemedi.");
    } else {
      setRecipe({ ...recipe, recipe_steps: recipe.recipe_steps.filter((step) => step.id !== id) });
      setMessage("Adım silindi.");
    }
  }

  async function addToShoppingList() {
    if (!session) return;
    setAdding(true);
    setMessage("");

    const response = await fetch("/api/add-to-shopping-list", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ recipe_id: params.id })
    });
    const payload = await response.json();
    setMessage(response.ok ? `${payload.count} malzeme listeye eklendi.` : payload.error ?? "Eklenemedi.");
    setAdding(false);
  }

  async function copyRecipeToMyBook() {
    if (!recipe || !session) return;
    setAdding(true);
    setMessage("");

    const response = await fetch("/api/copy-recipe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ recipe_id: recipe.id })
    });
    const payload = await response.json();
    if (response.ok) {
      router.push(`/recipes/${payload.id}`);
    } else {
      setMessage(payload.error ?? "Tarif deftere eklenemedi.");
    }
    setAdding(false);
  }

  async function calculateNutrition(options?: { silent?: boolean }) {
    if (!recipe || !session) return;
    setCalculatingNutrition(true);
    if (!options?.silent) setMessage("");

    const response = await fetch("/api/calculate-nutrition", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ recipe_id: recipe.id })
    });
    const payload = await response.json();

    if (response.ok) {
      setRecipe({ ...recipe, recipe_nutrition: [payload.nutrition] });
      if (!options?.silent) setMessage("Kalori özeti hazırlandı.");
    } else {
      if (!options?.silent) setMessage(payload.error ?? "Kalori hesaplanamadı.");
    }
    setCalculatingNutrition(false);
  }

  async function lightenCurrentRecipe() {
    if (!recipe || !session) return;
    setLighteningRecipe(true);
    setMessage("");

    const response = await fetch("/api/lighten-recipe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ recipe_id: recipe.id })
    });
    const payload = await response.json();

    if (response.ok) {
      setRecipe({
        ...recipe,
        recipe_lighten_suggestions: [payload.suggestion as RecipeLightenSuggestionRow]
      });
      setMessage("Daha hafif öneriler hazır.");
    } else {
      setMessage(payload.error ?? "Tarif hafifletilemedi.");
    }
    setLighteningRecipe(false);
  }

  function speakKitchenStep() {
    if (!recipe?.recipe_steps.length) return;
    const step = recipe.recipe_steps[kitchenStepIndex];
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${kitchenStepIndex + 1}. adım. ${step.description}`));
  }

  function nextKitchenStep() {
    if (!recipe?.recipe_steps.length) return;
    setKitchenStepIndex((current) => Math.min(current + 1, recipe.recipe_steps.length - 1));
  }

  async function deleteRecipe() {
    if (!recipe || !window.confirm("Bu tarifi defterden silmek istiyor musun?")) return;
    setDeleting(true);
    setMessage("");

    const supabase = getBrowserSupabase();
    const { error } = await supabase.from("recipes").delete().eq("id", recipe.id);
    if (error) {
      setMessage("Tarif silinemedi.");
      setDeleting(false);
      return;
    }
    router.push("/recipes");
  }

  return (
    <AuthGate>
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-5">
        <Link href="/recipes" className="inline-flex items-center gap-2 text-sm font-semibold text-rosewood">
          <ArrowLeft size={16} />
          Tariflere dön
        </Link>

        {loading ? (
          <p className="soft-card rounded-3xl p-5 text-sm text-cocoa/70">Tarif açılıyor...</p>
        ) : recipe ? (
          <>
            <article className="soft-card overflow-hidden rounded-3xl">
              <div className="relative h-64 bg-gradient-to-br from-melon via-peach to-butter">
                <SafeImage
                  src={recipe.image_url}
                  alt={recipe.title}
                  className="h-full w-full object-cover"
                  fallback={
                    <div className="flex h-full flex-col items-center justify-center gap-2 px-5 text-center text-rosewood">
                      <ImageIcon size={42} />
                      <button
                        className="mt-2 rounded-full bg-white px-4 py-2 text-xs font-black text-papaya shadow-soft disabled:opacity-60"
                        onClick={() => void refreshRecipeImage()}
                        disabled={refreshingImage}
                      >
                        {refreshingImage ? "Aranıyor..." : "Fotoğrafı bul"}
                      </button>
                      <span className="text-sm font-semibold">Bu tarifin fotoğrafı beklemede</span>
                      {photoMessage ? (
                        <span className="max-w-md rounded-2xl bg-white/85 px-3 py-2 text-xs font-semibold leading-5 text-rosewood shadow-soft">
                          {photoMessage}
                        </span>
                      ) : null}
                    </div>
                  }
                />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-cocoa/45 to-transparent" />
              </div>

              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sage">{recipe.category || "Tarif"}</p>
                {editingTitle ? (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      className="min-w-0 flex-1 rounded-2xl border border-rosewood/10 bg-white px-3 py-3 text-2xl font-semibold outline-none focus:ring-4 focus:ring-papaya/15"
                      value={titleDraft}
                      onChange={(event) => setTitleDraft(event.target.value)}
                      autoFocus
                    />
                    <IconButton label="Kaydet" busy={savingTitle} onClick={() => void saveTitle()} icon={<Check size={18} />} />
                    <IconButton
                      label="Vazgeç"
                      onClick={() => {
                        setTitleDraft(recipe.title);
                        setEditingTitle(false);
                      }}
                      icon={<X size={18} />}
                    />
                  </div>
                ) : (
                  <div className="mt-2 flex items-start gap-2">
                    <h1 className="min-w-0 flex-1 text-3xl font-semibold leading-tight">{recipe.title}</h1>
                    {canEdit ? <IconButton label="Tarif adını düzenle" onClick={() => setEditingTitle(true)} icon={<Pencil size={17} />} /> : null}
                  </div>
                )}

                {editingMeta ? (
                  <div className="mt-4 grid gap-2 rounded-3xl bg-cream-100/70 p-3">
                    <input className="rounded-2xl bg-white px-3 py-3 text-sm outline-none" placeholder="Kategori" value={metaDraft.category} onChange={(e) => setMetaDraft({ ...metaDraft, category: e.target.value })} />
                    <div className="grid grid-cols-2 gap-2">
                      <input className="rounded-2xl bg-white px-3 py-3 text-sm outline-none" placeholder="Süre" value={metaDraft.cooking_time} onChange={(e) => setMetaDraft({ ...metaDraft, cooking_time: e.target.value })} />
                      <input className="rounded-2xl bg-white px-3 py-3 text-sm outline-none" placeholder="Kişi" value={metaDraft.servings} onChange={(e) => setMetaDraft({ ...metaDraft, servings: e.target.value })} />
                    </div>
                    <div className="flex gap-2">
                      <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-cocoa px-4 py-3 text-sm font-semibold text-white" onClick={() => void saveMeta()} disabled={savingMeta}>
                        {savingMeta ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                        Kaydet
                      </button>
                      <button className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-cocoa" onClick={() => setEditingMeta(false)}>
                        Vazgeç
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-cocoa/70">
                    <span className="inline-flex items-center gap-1 rounded-full bg-cream-100 px-3 py-1">
                      <Clock size={13} />
                      {recipe.cooking_time || "Süre yok"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-cream-100 px-3 py-1">
                      <Users size={13} />
                      {recipe.servings || "Kişi yok"}
                    </span>
                    {canEdit ? (
                      <button className="rounded-full bg-butter px-3 py-1 font-semibold text-rosewood" onClick={() => setEditingMeta(true)}>
                        Bilgileri düzenle
                      </button>
                    ) : null}
                  </div>
                )}
                {recipe.notes ? <p className="mt-4 text-sm leading-6 text-cocoa/70">{recipe.notes}</p> : null}
              </div>
            </article>

            {serraScore ? <SerraScoreCard score={serraScore} /> : null}

            <NutritionCard
              nutrition={recipe.recipe_nutrition?.[0] ?? null}
              calculating={calculatingNutrition}
            />

            {canEdit ? (
              <LightenRecipeCard
                suggestion={recipe.recipe_lighten_suggestions?.[0] ?? null}
                loading={lighteningRecipe}
                onLighten={() => void lightenCurrentRecipe()}
              />
            ) : null}

            <section className="soft-card rounded-3xl p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Malzemeler</h2>
                <span className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-sage">
                  {recipe.recipe_ingredients.length} parça
                </span>
              </div>
              <ul className="mt-4 grid gap-3">
                {recipe.recipe_ingredients.map((ingredient) => (
                  <li key={ingredient.id} className="rounded-2xl bg-white px-3 py-3 text-sm shadow-[0_8px_22px_rgba(82,57,42,0.05)]">
                    {editingIngredientId === ingredient.id ? (
                      <div className="grid gap-2">
                        <input className="rounded-2xl bg-cream-100 px-3 py-3 outline-none" value={ingredientDraft.name} onChange={(e) => setIngredientDraft({ ...ingredientDraft, name: e.target.value })} />
                        <div className="grid grid-cols-2 gap-2">
                          <input className="rounded-2xl bg-cream-100 px-3 py-3 outline-none" placeholder="Miktar" value={ingredientDraft.amount} onChange={(e) => setIngredientDraft({ ...ingredientDraft, amount: e.target.value })} />
                          <input className="rounded-2xl bg-cream-100 px-3 py-3 outline-none" placeholder="Birim" value={ingredientDraft.unit} onChange={(e) => setIngredientDraft({ ...ingredientDraft, unit: e.target.value })} />
                        </div>
                        <div className="flex gap-2">
                          <button className="flex-1 rounded-2xl bg-cocoa px-4 py-3 font-semibold text-white" onClick={() => void updateIngredient(ingredient.id)}>Kaydet</button>
                          <button className="rounded-2xl bg-cream-100 px-4 py-3 font-semibold" onClick={() => setEditingIngredientId(null)}>Vazgeç</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <IngredientIcon name={ingredient.name} />
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold">{ingredient.name}</span>
                          <span className="ml-2 text-cocoa/60">{[ingredient.amount, ingredient.unit].filter(Boolean).join(" ")}</span>
                        </div>
                        {canEdit ? (
                          <>
                            <IconButton label="Malzemeyi düzenle" onClick={() => startIngredientEdit(ingredient)} icon={<Pencil size={15} />} />
                            <IconButton label="Malzemeyi sil" onClick={() => void deleteIngredient(ingredient.id)} icon={<Trash2 size={15} />} danger />
                          </>
                        ) : null}
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {canEdit ? <div className="mt-5 rounded-3xl bg-cream-100/70 p-3">
                <p className="text-sm font-semibold">Malzeme ekle</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <input className="col-span-2 rounded-2xl border border-rosewood/10 bg-white px-3 py-3 text-sm outline-none focus:ring-4 focus:ring-rosewood/10" placeholder="Malzeme adı" value={ingredientForm.name} onChange={(event) => setIngredientForm({ ...ingredientForm, name: event.target.value })} />
                  <input className="rounded-2xl border border-rosewood/10 bg-white px-3 py-3 text-sm outline-none focus:ring-4 focus:ring-rosewood/10" placeholder="Miktar" value={ingredientForm.amount} onChange={(event) => setIngredientForm({ ...ingredientForm, amount: event.target.value })} />
                  <input className="rounded-2xl border border-rosewood/10 bg-white px-3 py-3 text-sm outline-none focus:ring-4 focus:ring-rosewood/10" placeholder="Birim" value={ingredientForm.unit} onChange={(event) => setIngredientForm({ ...ingredientForm, unit: event.target.value })} />
                </div>
                <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-cocoa px-4 py-3 text-sm font-semibold text-white disabled:opacity-55" onClick={() => void addIngredient()} disabled={savingIngredient || !ingredientForm.name.trim()}>
                  {savingIngredient ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                  Malzemeye ekle
                </button>
              </div> : null}

              <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-rosewood px-5 py-4 font-semibold text-white" onClick={() => void (canEdit ? addToShoppingList() : copyRecipeToMyBook())} disabled={adding}>
                {adding ? <Loader2 className="animate-spin" size={18} /> : canEdit ? <ShoppingBasket size={18} /> : <Plus size={18} />}
                {canEdit ? "Alışveriş listesine ekle" : "Defterime ekle"}
              </button>
            </section>

            <section className="soft-card rounded-3xl p-5">
              <h2 className="text-xl font-semibold">Yapılış</h2>
              <KitchenModeCard
                steps={recipe.recipe_steps}
                currentIndex={kitchenStepIndex}
                onSpeak={speakKitchenStep}
                onNext={nextKitchenStep}
              />
              <ol className="mt-4 grid gap-4">
                {recipe.recipe_steps.map((step) => (
                  <li key={step.id} className="rounded-2xl bg-white/70 p-3 text-sm leading-6">
                    {editingStepId === step.id ? (
                      <div className="grid gap-2">
                        <textarea className="min-h-24 rounded-2xl bg-cream-100 px-3 py-3 outline-none" value={stepDraft} onChange={(e) => setStepDraft(e.target.value)} />
                        <div className="flex gap-2">
                          <button className="flex-1 rounded-2xl bg-cocoa px-4 py-3 font-semibold text-white" onClick={() => void updateStep(step.id)}>Kaydet</button>
                          <button className="rounded-2xl bg-cream-100 px-4 py-3 font-semibold" onClick={() => setEditingStepId(null)}>Vazgeç</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-butter font-semibold text-rosewood">{step.step_order}</span>
                        <span className="min-w-0 flex-1">{step.description}</span>
                        <div className="flex shrink-0 gap-1">
                          {canEdit ? (
                            <>
                              <IconButton label="Adımı düzenle" onClick={() => startStepEdit(step)} icon={<Pencil size={15} />} />
                              <IconButton label="Adımı sil" onClick={() => void deleteStep(step.id)} icon={<Trash2 size={15} />} danger />
                            </>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ol>

              {canEdit ? <div className="mt-5 rounded-3xl bg-cream-100/70 p-3">
                <p className="text-sm font-semibold">Yeni adım ekle</p>
                <textarea className="mt-3 min-h-24 w-full rounded-2xl border border-rosewood/10 bg-white px-3 py-3 text-sm outline-none focus:ring-4 focus:ring-rosewood/10" placeholder={`${nextStepOrder}. adımı yaz`} value={stepText} onChange={(event) => setStepText(event.target.value)} />
                <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-cocoa px-4 py-3 text-sm font-semibold text-white disabled:opacity-55" onClick={() => void addStep()} disabled={savingStep || !stepText.trim()}>
                  {savingStep ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                  Yapılışa ekle
                </button>
              </div> : null}
            </section>

            {message ? <p className="rounded-2xl bg-mint px-4 py-3 text-sm font-semibold text-sage">{message}</p> : null}

            {canEdit ? (
              <button className="flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-semibold text-red-700" onClick={() => void deleteRecipe()} disabled={deleting}>
                {deleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                Tarifi sil
              </button>
            ) : null}
          </>
        ) : (
          <p className="soft-card rounded-3xl p-5 text-sm text-cocoa/70">Tarif bulunamadı.</p>
        )}
      </section>
    </AuthGate>
  );
}

function SerraScoreCard({ score }: { score: ReturnType<typeof calculateSerraScore> }) {
  return (
    <section className="soft-card rounded-3xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-sage">Serra Puanı</p>
          <h2 className="mt-2 text-3xl font-black text-cocoa">{score.total}/100</h2>
          <p className="mt-1 text-sm font-black text-rosewood">{score.label}</p>
        </div>
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-butter to-melon text-xl font-black text-white shadow-soft">
          {score.total}
        </span>
      </div>
      <p className="mt-4 rounded-2xl bg-cream-100/75 px-4 py-3 text-sm font-semibold leading-6 text-cocoa/70">{score.note}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <ScoreMini label="Pratiklik" value={score.practicality} />
        <ScoreMini label="Hafiflik" value={score.lightness} />
        <ScoreMini label="Netlik" value={score.clarity} />
        <ScoreMini label="Keyif" value={score.charm} />
      </div>
    </section>
  );
}

function ScoreMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-3">
      <div className="flex items-center justify-between text-xs font-black text-cocoa/60">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream-100">
        <div className="h-full rounded-full bg-gradient-to-r from-papaya to-butter" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function KitchenModeCard({
  steps,
  currentIndex,
  onSpeak,
  onNext
}: {
  steps: RecipeDetail["recipe_steps"];
  currentIndex: number;
  onSpeak: () => void;
  onNext: () => void;
}) {
  const currentStep = steps[currentIndex];
  if (!currentStep) return null;

  return (
    <div className="mt-4 rounded-3xl bg-gradient-to-br from-cocoa to-rosewood p-4 text-white shadow-premium">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/55">Mutfak modu</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-white/85">
        {currentIndex + 1}. adım: {currentStep.description}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className="flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-4 py-3 text-sm font-black" onClick={onSpeak}>
          <Volume2 size={17} />
          Sesli oku
        </button>
        <button className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-cocoa" onClick={onNext}>
          <SkipForward size={17} />
          Sonraki
        </button>
      </div>
    </div>
  );
}

function LightenRecipeCard({
  suggestion,
  loading,
  onLighten
}: {
  suggestion: RecipeLightenSuggestionRow | null;
  loading: boolean;
  onLighten: () => void;
}) {
  const result = suggestion?.result;

  if (!result) {
    return (
      <section className="soft-card rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint text-sage">
            <WandSparkles size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">Hafif Versiyon</h2>
            <p className="mt-1 text-sm leading-6 text-cocoa/65">Lezzeti bozmadan daha dengeli öneriler çıkaralım.</p>
          </div>
        </div>
        <button
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sage to-mint px-5 py-4 font-black text-white shadow-soft disabled:opacity-60"
          onClick={onLighten}
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <WandSparkles size={18} />}
          Bu tarifi hafiflet
        </button>
      </section>
    );
  }

  return (
    <section className="soft-card rounded-3xl p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mint text-sage">
          <WandSparkles size={22} />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sage">Hafif Versiyon</p>
          <h2 className="mt-1 text-xl font-semibold text-cocoa">{result.summary || "Tarifin daha hafif hali hazır."}</h2>
        </div>
      </div>

      {result.suggestions.length ? (
        <div className="mt-4 grid gap-3">
          {result.suggestions.map((item, index) => (
            <div key={`${item.original}-${index}`} className="rounded-2xl bg-white px-4 py-3 shadow-[0_8px_22px_rgba(82,57,42,0.05)]">
              <p className="text-sm font-black text-cocoa">
                {item.original || "Mevcut tercih"} → {item.replacement || "Daha hafif alternatif"}
              </p>
              <p className="mt-1 text-sm leading-6 text-cocoa/65">{item.reason}</p>
              {item.calorie_impact ? <p className="mt-1 text-xs font-semibold text-sage">{item.calorie_impact}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      {result.lighter_version_steps.length ? (
        <div className="mt-5 rounded-2xl bg-cream-100/75 p-4">
          <p className="text-sm font-black text-cocoa">Daha hafif yapılış</p>
          <ol className="mt-3 grid gap-2 text-sm leading-6 text-cocoa/70">
            {result.lighter_version_steps.map((step, index) => (
              <li key={`${step}-${index}`} className="flex gap-2">
                <span className="font-black text-sage">{index + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}

function NutritionCard({
  nutrition,
  calculating
}: {
  nutrition: NonNullable<RecipeDetail["recipe_nutrition"]>[number] | null;
  calculating: boolean;
}) {
  if (!nutrition) {
    return (
      <section className="soft-card rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-butter text-rosewood">
            <Flame size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">Besin Özeti</h2>
            <p className="mt-1 text-sm text-cocoa/65">
              {calculating ? "Kalori ve makro tahmini hazırlanıyor..." : "Kalori bilgisi birazdan burada görünecek."}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-butter/55 px-4 py-3 text-sm font-semibold text-rosewood">
          {calculating ? <Loader2 className="animate-spin" size={18} /> : <Flame size={18} />}
          <span>{calculating ? "Besin özeti hesaplanıyor" : "Tarif açılınca otomatik hesaplanır"}</span>
        </div>
      </section>
    );
  }

  return (
    <section className="soft-card rounded-3xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sage">Besin Özeti</p>
          <h2 className="mt-2 text-3xl font-black text-cocoa">{nutrition.calories_per_serving || nutrition.total_calories} kcal</h2>
          <p className="mt-1 text-sm font-semibold text-cocoa/60">
            {nutrition.calories_per_serving ? "Porsiyon başı" : "Toplam tahmin"}
          </p>
        </div>
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-butter text-rosewood">
          <Flame size={22} />
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MacroPill label="Protein" value={`${roundMacro(nutrition.protein_g)}g`} />
        <MacroPill label="Karbonhidrat" value={`${roundMacro(nutrition.carbs_g)}g`} />
        <MacroPill label="Yağ" value={`${roundMacro(nutrition.fat_g)}g`} />
      </div>
      <div className="mt-4 rounded-2xl bg-cream-100/75 px-4 py-3 text-sm leading-6 text-cocoa/70">
        <p>
          Toplam yaklaşık <strong>{nutrition.total_calories} kcal</strong>. Güven puanı:{" "}
          <strong>{Math.round((nutrition.confidence ?? 0) * 100)}%</strong>.
        </p>
        {nutrition.nutrition_note ? <p className="mt-1">{nutrition.nutrition_note}</p> : null}
      </div>
    </section>
  );
}

function MacroPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-3 text-center shadow-[0_8px_22px_rgba(82,57,42,0.05)]">
      <p className="text-xs font-semibold text-cocoa/55">{label}</p>
      <p className="mt-1 text-base font-black text-cocoa">{value}</p>
    </div>
  );
}

function roundMacro(value: number) {
  return Number(value ?? 0).toFixed(value % 1 ? 1 : 0);
}

function IconButton({
  label,
  icon,
  onClick,
  busy,
  danger
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${
        danger ? "bg-red-50 text-red-700" : "bg-cream-100 text-rosewood"
      } disabled:opacity-60`}
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      title={label}
    >
      {busy ? <Loader2 className="animate-spin" size={17} /> : icon}
    </button>
  );
}
