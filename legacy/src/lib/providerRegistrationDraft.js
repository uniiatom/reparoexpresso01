import { supabase } from '@/lib/supabase/client';
import { DEFAULT_PROVIDER_FORM } from '@/lib/providerRegistration';
import { createDefaultSchedule } from '@/lib/providerSchedule';

const SENSITIVE_FIELDS = ['password', 'confirmPassword'];

/** Campos que nunca vão para o banco no rascunho */
export function sanitizeFormForDraft(form) {
  const copy = { ...form };
  for (const key of SENSITIVE_FIELDS) delete copy[key];
  return copy;
}

export function hasDraftContent(form) {
  if (!form) return false;
  return Boolean(
    form.name?.trim()
    || form.phone?.trim()
    || form.email?.trim()
    || form.street?.trim()
    || form.city?.trim()
    || (form.coverage_regions?.length > 0)
    || (form.qualifications?.length > 0)
    || form.serviceOfferings?.some((o) => o.serviceType),
  );
}

export function draftToForm(draft) {
  const base = {
    ...DEFAULT_PROVIDER_FORM,
    qualifications: [],
    schedule: createDefaultSchedule(),
  };
  if (!draft?.form_data || typeof draft.form_data !== 'object') return base;

  const saved = draft.form_data;
  return {
    ...base,
    ...saved,
    password: '',
    confirmPassword: '',
    qualifications: Array.isArray(saved.qualifications) ? saved.qualifications : [],
    coverage_regions: Array.isArray(saved.coverage_regions) ? saved.coverage_regions : [],
    serviceOfferings: saved.serviceOfferings?.length
      ? saved.serviceOfferings
      : [{ serviceType: '' }],
    schedule: saved.schedule ?? createDefaultSchedule(),
  };
}

export async function loadProviderRegistrationDraft(ownerId, context = 'admin') {
  if (!ownerId) return null;

  const { data, error } = await supabase
    .from('provider_registration_drafts')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('context', context)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveProviderRegistrationDraft({
  ownerId,
  context = 'admin',
  form,
  customFieldValues = {},
  autoApprove = false,
}) {
  if (!ownerId) return null;

  const payload = {
    owner_id: ownerId,
    context,
    form_data: sanitizeFormForDraft(form),
    custom_field_values: customFieldValues ?? {},
    auto_approve: Boolean(autoApprove),
  };

  const { data, error } = await supabase
    .from('provider_registration_drafts')
    .upsert(payload, { onConflict: 'owner_id,context' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProviderRegistrationDraft(ownerId, context = 'admin') {
  if (!ownerId) return;

  const { error } = await supabase
    .from('provider_registration_drafts')
    .delete()
    .eq('owner_id', ownerId)
    .eq('context', context);

  if (error) throw error;
}
