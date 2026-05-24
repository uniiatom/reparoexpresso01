-- Biblioteca central de imagens enviadas pelo app

CREATE TABLE IF NOT EXISTS public.media_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_url text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  bucket text NOT NULL DEFAULT 'uploads',
  file_name text,
  mime_type text,
  file_size bigint,
  source text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_library_created_at_idx
  ON public.media_library (created_at DESC);

CREATE INDEX IF NOT EXISTS media_library_source_idx
  ON public.media_library (source);

ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS media_library_select ON public.media_library;
CREATE POLICY media_library_select ON public.media_library
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS media_library_insert ON public.media_library;
CREATE POLICY media_library_insert ON public.media_library
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS media_library_staff ON public.media_library;
CREATE POLICY media_library_staff ON public.media_library
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
