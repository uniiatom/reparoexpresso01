-- Extensão da tabela provider_config
-- Adiciona: allowed_services, allowed_weekdays, allowed_hours_start/end, allowed_regions

ALTER TABLE public.provider_config
  ADD COLUMN IF NOT EXISTS allowed_services    text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allowed_weekdays    int[]   DEFAULT '{0,1,2,3,4,5,6}',
  ADD COLUMN IF NOT EXISTS allowed_hours_start text    DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS allowed_hours_end   text    DEFAULT '20:00',
  ADD COLUMN IF NOT EXISTS allowed_regions     text[]  DEFAULT '{}';
