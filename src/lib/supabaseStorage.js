import { supabase } from '@/lib/supabase/client';
import { DEFAULT_MEDIA_BUCKET, isImageFile, registerMediaAsset } from '@/lib/mediaLibrary';

const DEFAULT_BUCKET = DEFAULT_MEDIA_BUCKET;

function buildObjectPath(file) {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(0, 80);
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName || `file.${ext}`}`;
}

/**
 * Envia arquivo para Supabase Storage.
 * Compatível com base44.integrations.Core.UploadFile({ file }).
 */
export async function uploadFile({ file, bucket = DEFAULT_BUCKET, source = null }) {
  if (!file) throw new Error('Arquivo não informado.');

  const path = buildObjectPath(file);
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) throw error;

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  const file_url = publicData.publicUrl;

  if (isImageFile(file)) {
    await registerMediaAsset({
      file_url,
      storage_path: data.path,
      bucket,
      file,
      source,
    });
  }

  return { file_url, path: data.path };
}

/** Substitui base44.integrations.Core. */
export function createSupabaseIntegrations() {
  return {
    Core: {
      UploadFile: uploadFile,
    },
  };
}
