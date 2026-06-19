insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Users can upload own recipe images" on storage.objects;
create policy "Users can upload own recipe images"
on storage.objects for insert
with check (
  bucket_id = 'recipe-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own recipe images" on storage.objects;
create policy "Users can update own recipe images"
on storage.objects for update
using (
  bucket_id = 'recipe-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'recipe-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own recipe images" on storage.objects;
create policy "Users can delete own recipe images"
on storage.objects for delete
using (
  bucket_id = 'recipe-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);
