create table if not exists public.recipe_nutrition (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null unique references public.recipes(id) on delete cascade,
  total_calories integer not null default 0,
  calories_per_serving integer not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  confidence numeric not null default 0,
  nutrition_note text,
  created_at timestamptz not null default now()
);

create index if not exists recipe_nutrition_recipe_id_idx on public.recipe_nutrition(recipe_id);

alter table public.recipe_nutrition enable row level security;

drop policy if exists "Users can read nutrition from own recipes" on public.recipe_nutrition;
create policy "Users can read nutrition from own recipes"
on public.recipe_nutrition for select
using (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_nutrition.recipe_id
    and recipes.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert nutrition into own recipes" on public.recipe_nutrition;
create policy "Users can insert nutrition into own recipes"
on public.recipe_nutrition for insert
with check (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_nutrition.recipe_id
    and recipes.user_id = auth.uid()
  )
);

drop policy if exists "Users can update nutrition from own recipes" on public.recipe_nutrition;
create policy "Users can update nutrition from own recipes"
on public.recipe_nutrition for update
using (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_nutrition.recipe_id
    and recipes.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_nutrition.recipe_id
    and recipes.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete nutrition from own recipes" on public.recipe_nutrition;
create policy "Users can delete nutrition from own recipes"
on public.recipe_nutrition for delete
using (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_nutrition.recipe_id
    and recipes.user_id = auth.uid()
  )
);
