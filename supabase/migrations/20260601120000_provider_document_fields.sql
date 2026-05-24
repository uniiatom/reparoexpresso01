-- Documentos adicionais do prestador (PF) + status de comprovante de endereço

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS id_holding_document_url text,
  ADD COLUMN IF NOT EXISTS id_holding_document_status text NOT NULL DEFAULT 'nao_enviado',
  ADD COLUMN IF NOT EXISTS id_holding_document_rejection_reason text,
  ADD COLUMN IF NOT EXISTS address_proof_status text NOT NULL DEFAULT 'nao_enviado',
  ADD COLUMN IF NOT EXISTS address_proof_rejection_reason text,
  ADD COLUMN IF NOT EXISTS crlv_vehicle_type text;

COMMENT ON COLUMN public.providers.crlv_vehicle_type IS 'carro | moto';
