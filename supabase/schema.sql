create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  source_url text,
  image_url text,
  category text,
  servings text,
  cooking_time text,
  notes text,
  is_favorite boolean not null default false,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

update public.recipes
set is_public = true
where is_public is distinct from true;

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  name text not null,
  amount text,
  unit text
);

create table if not exists public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  step_order integer not null,
  description text not null
);

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

create table if not exists public.recipe_lighten_suggestions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null unique references public.recipes(id) on delete cascade,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.recipe_ratings (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recipe_id, user_id)
);

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete cascade,
  name text not null,
  amount text,
  unit text,
  is_checked boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists recipes_user_id_created_at_idx on public.recipes(user_id, created_at desc);
create index if not exists recipes_public_created_at_idx on public.recipes(is_public, created_at desc);
create index if not exists recipe_ingredients_recipe_id_idx on public.recipe_ingredients(recipe_id);
create index if not exists recipe_steps_recipe_id_idx on public.recipe_steps(recipe_id, step_order);
create index if not exists recipe_nutrition_recipe_id_idx on public.recipe_nutrition(recipe_id);
create index if not exists recipe_lighten_suggestions_recipe_id_idx on public.recipe_lighten_suggestions(recipe_id);
create index if not exists recipe_ratings_recipe_id_idx on public.recipe_ratings(recipe_id);
create index if not exists recipe_ratings_user_id_idx on public.recipe_ratings(user_id);
create index if not exists shopping_items_user_id_created_at_idx on public.shopping_items(user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_recipes_updated_at on public.recipes;
create trigger set_recipes_updated_at
before update on public.recipes
for each row execute function public.set_updated_at();

drop trigger if exists set_recipe_ratings_updated_at on public.recipe_ratings;
create trigger set_recipe_ratings_updated_at
before update on public.recipe_ratings
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.users enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.recipe_nutrition enable row level security;
alter table public.recipe_lighten_suggestions enable row level security;
alter table public.recipe_ratings enable row level security;
alter table public.shopping_items enable row level security;

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
on public.users for select
using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
on public.users for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
on public.users for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can read own recipes" on public.recipes;
create policy "Users can read own recipes"
on public.recipes for select
using (auth.uid() = user_id);

drop policy if exists "Users can read public recipes" on public.recipes;
create policy "Users can read public recipes"
on public.recipes for select
using (true);

drop policy if exists "Users can insert own recipes" on public.recipes;
create policy "Users can insert own recipes"
on public.recipes for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own recipes" on public.recipes;
create policy "Users can update own recipes"
on public.recipes for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own recipes" on public.recipes;
create policy "Users can delete own recipes"
on public.recipes for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read ingredients from own recipes" on public.recipe_ingredients;
create policy "Users can read ingredients from own recipes"
on public.recipe_ingredients for select
using (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
    and recipes.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert ingredients into own recipes" on public.recipe_ingredients;
create policy "Users can insert ingredients into own recipes"
on public.recipe_ingredients for insert
with check (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
    and recipes.user_id = auth.uid()
  )
);

drop policy if exists "Users can update ingredients from own recipes" on public.recipe_ingredients;
create policy "Users can update ingredients from own recipes"
on public.recipe_ingredients for update
using (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
    and recipes.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
    and recipes.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete ingredients from own recipes" on public.recipe_ingredients;
create policy "Users can delete ingredients from own recipes"
on public.recipe_ingredients for delete
using (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
    and recipes.user_id = auth.uid()
  )
);

drop policy if exists "Users can read steps from own recipes" on public.recipe_steps;
create policy "Users can read steps from own recipes"
on public.recipe_steps for select
using (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_steps.recipe_id
    and recipes.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert steps into own recipes" on public.recipe_steps;
create policy "Users can insert steps into own recipes"
on public.recipe_steps for insert
with check (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_steps.recipe_id
    and recipes.user_id = auth.uid()
  )
);

drop policy if exists "Users can update steps from own recipes" on public.recipe_steps;
create policy "Users can update steps from own recipes"
on public.recipe_steps for update
using (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_steps.recipe_id
    and recipes.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_steps.recipe_id
    and recipes.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete steps from own recipes" on public.recipe_steps;
create policy "Users can delete steps from own recipes"
on public.recipe_steps for delete
using (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_steps.recipe_id
    and recipes.user_id = auth.uid()
  )
);

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

drop policy if exists "Users can read ratings" on public.recipe_ratings;
create policy "Users can read ratings"
on public.recipe_ratings for select
using (true);

drop policy if exists "Users can rate as themselves" on public.recipe_ratings;
create policy "Users can rate as themselves"
on public.recipe_ratings for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own ratings" on public.recipe_ratings;
create policy "Users can update own ratings"
on public.recipe_ratings for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own ratings" on public.recipe_ratings;
create policy "Users can delete own ratings"
on public.recipe_ratings for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own shopping items" on public.shopping_items;
create policy "Users can read own shopping items"
on public.shopping_items for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own shopping items" on public.shopping_items;
create policy "Users can insert own shopping items"
on public.shopping_items for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own shopping items" on public.shopping_items;
create policy "Users can update own shopping items"
on public.shopping_items for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own shopping items" on public.shopping_items;
create policy "Users can delete own shopping items"
on public.shopping_items for delete
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do nothing;

update storage.buckets
set public = true
where id = 'recipe-images';

drop policy if exists "Users can read own recipe images" on storage.objects;
create policy "Users can read own recipe images"
on storage.objects for select
using (
  bucket_id = 'recipe-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can upload own recipe images" on storage.objects;
create policy "Users can upload own recipe images"
on storage.objects for insert
with check (
  bucket_id = 'recipe-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);
