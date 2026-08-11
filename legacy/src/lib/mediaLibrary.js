import { supabase } from '@/lib/supabase/client';

export const DEFAULT_MEDIA_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'uploads';

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|svg|avif|bmp)$/i;

export function isImageFile(file) {
  if (!file) return false;
  if (file.type?.startsWith('image/')) return true;
  return IMAGE_EXT.test(file.name || '');
}

export function isImageUrl(url) {
  if (!url) return false;
  return IMAGE_EXT.test(url.split('?')[0] || '');
}

export async function registerMediaAsset({
  file_url,
  storage_path,
  bucket = DEFAULT_MEDIA_BUCKET,
  file,
  source = null,
}) {
  const { data: authData } = await supabase.auth.getUser();
  const payload = {
    file_url,
    storage_path,
    bucket,
    file_name: file?.name || storage_path.split('/').pop() || null,
    mime_type: file?.type || null,
    file_size: file?.size ?? null,
    source,
    uploaded_by: authData.user?.id ?? null,
  };

  const { data, error } = await supabase
    .from('media_library')
    .upsert(payload, { onConflict: 'storage_path' })
    .select()
    .single();

  if (error) {
    console.warn('[mediaLibrary] registerMediaAsset:', error.message);
    return null;
  }
  return data;
}

/** Importa imagens já existentes no bucket Supabase Storage. */
export async function syncStorageImagesToMediaLibrary(bucket = DEFAULT_MEDIA_BUCKET) {
  const { data: files, error } = await supabase.storage.from(bucket).list('', {
    limit: 1000,
    sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error) throw error;

  const imageFiles = (files ?? []).filter(
    (item) => item.id && (isImageUrl(item.name) || item.metadata?.mimetype?.startsWith('image/')),
  );

  let imported = 0;
  for (const item of imageFiles) {
    const storage_path = item.name;
    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(storage_path);
    const result = await registerMediaAsset({
      file_url: publicData.publicUrl,
      storage_path,
      bucket,
      file: {
        name: item.name,
        type: item.metadata?.mimetype,
        size: item.metadata?.size,
      },
      source: 'storage_sync',
    });
    if (result) imported += 1;
  }
  return imported;
}
