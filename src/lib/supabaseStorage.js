import { supabase } from '@/lib/supabase/client';

const DEFAULT_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'uploads';

function buildObjectPath(file) {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(0, 80);
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName || `file.${ext}`}`;
}

/**
 * Envia arquivo para Supabase Storage.
 * Compatível com base44.integrations.Core.UploadFile({ file }).
 */
export async function uploadFile({ file, bucket = DEFAULT_BUCKET }) {
  if (!file) throw new Error('Arquivo não informado.');

  const path = buildObjectPath(file);
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) throw error;

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return { file_url: publicData.publicUrl, path: data.path };
}

/** Substitui base44.integrations.Core. */
export function createSupabaseIntegrations() {
  return {
    Core: {
      UploadFile: uploadFile,
    },
  };
}
