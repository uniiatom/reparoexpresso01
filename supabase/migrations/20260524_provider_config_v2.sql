-- provider_config v2: horários por dia com múltiplos intervalos + campos personalizados de cadastro

ALTER TABLE public.provider_config
  ADD COLUMN IF NOT EXISTS allowed_day_schedules      jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS custom_registration_fields jsonb DEFAULT '[]';

-- allowed_day_schedules: objeto JSON com chaves "0"–"6" (dia da semana).
-- Cada chave contém um array de intervalos: [{"start":"11:00","end":"20:00"}, ...]
-- Chave ausente ou array vazio = dia desabilitado.
-- Exemplo: {"1":[{"start":"11:00","end":"20:00"}],"2":[{"start":"20:00","end":"22:00"}]}

-- custom_registration_fields: array de campos personalizados criados pelo admin.
-- Cada item: {"id":"registro_crea_1234","label":"Registro CREA","field_type":"text","is_required":true,"sort_order":0}
-- field_type: text | textarea | number | file
