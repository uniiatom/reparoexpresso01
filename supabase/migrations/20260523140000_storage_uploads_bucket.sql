-- Bucket público para uploads do app (fotos, documentos, comprovantes).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'uploads',
  'uploads',
  true,
  10485760,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- Leitura pública (bucket público).
create policy "uploads_public_read"
  on storage.objects for select
  using (bucket_id = 'uploads');

-- Usuários autenticados podem enviar arquivos.
create policy "uploads_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'uploads');

-- Usuários autenticados podem atualizar/remover seus próprios arquivos.
create policy "uploads_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'uploads' and auth.uid() = owner);

create policy "uploads_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'uploads' and auth.uid() = owner);
