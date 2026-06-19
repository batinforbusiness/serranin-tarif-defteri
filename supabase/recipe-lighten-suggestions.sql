create table if not exists public.recipe_lighten_suggestions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null unique references public.recipes(id) on delete cascade,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists recipe_lighten_suggestions_recipe_id_idx on public.recipe_lighten_suggestions(recipe_id);

alter table public.recipe_lighten_suggestions enable row level security;

drop policy if exists "Users can read lighten suggestions from own recipes" on public.recipe_lighten_suggestions;
create policy "Users can read lighten suggestions from own recipes"
on public.recipe_lighten_suggestions for select
using (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_lighten_suggestions.recipe_id
    and recipes.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert lighten suggestions into own recipes" on public.recipe_lighten_suggestions;
create policy "Users can insert lighten suggestions into own recipes"
on public.recipe_lighten_suggestions for insert
with check (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_lighten_suggestions.recipe_id
    and recipes.user_id = auth.uid()
  )
);

drop policy if exists "Users can update lighten suggestions from own recipes" on public.recipe_lighten_suggestions;
create policy "Users can update lighten suggestions from own recipes"
on public.recipe_lighten_suggestions for update
using (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_lighten_suggestions.recipe_id
    and recipes.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_lighten_suggestions.recipe_id
    and recipes.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete lighten suggestions from own recipes" on public.recipe_lighten_suggestions;
create policy "Users can delete lighten suggestions from own recipes"
on public.recipe_lighten_suggestions for delete
using (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_lighten_suggestions.recipe_id
    and recipes.user_id = auth.uid()
  )
);
