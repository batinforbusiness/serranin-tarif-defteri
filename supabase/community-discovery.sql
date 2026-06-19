alter table public.recipes
add column if not exists is_public boolean not null default true;

update public.recipes
set is_public = true
where is_public is distinct from true;

create table if not exists public.recipe_ratings (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recipe_id, user_id)
);

create index if not exists recipes_public_created_at_idx on public.recipes(is_public, created_at desc);
create index if not exists recipe_ratings_recipe_id_idx on public.recipe_ratings(recipe_id);
create index if not exists recipe_ratings_user_id_idx on public.recipe_ratings(user_id);

drop trigger if exists set_recipe_ratings_updated_at on public.recipe_ratings;
create trigger set_recipe_ratings_updated_at
before update on public.recipe_ratings
for each row execute function public.set_updated_at();

alter table public.recipe_ratings enable row level security;

drop policy if exists "Users can read public recipes" on public.recipes;
create policy "Users can read public recipes"
on public.recipes for select
using (true);

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
