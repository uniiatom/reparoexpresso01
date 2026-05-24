import { supabase } from '@/lib/supabase/client';
import { getProviderServiceLabel } from '@/lib/offeredServices';
import { base44 } from '@/api/base44Client';
import { invokeFunction } from '@/lib/supabaseFunctions';
import {
  createProvider,
  createProviderAvailability,
  deleteProviderAvailability,
  filterProviderAvailability,
  getProvider,
  listProviderConfig,
  updateProvider,
} from '@/lib/repositories/providersRepository';
import {
  availabilityToSchedule,
  createDefaultSchedule,
  normalizeSchedule,
  scheduleToAvailabilityRecords,
  validateSchedule,
} from '@/lib/providerSchedule';
import { PROVIDER_DOCUMENT_FIELD_MAP } from '@/lib/providerRegistrationFields';

export const DEFAULT_PROVIDER_FORM = {
  // ── Acesso ──────────────────────────────────────────
  email: '',
  password: '',
  confirmPassword: '',
  // ── Dados pessoais ──────────────────────────────────
  name: '',
  phone: '',
  birth_date: '',
  cpf: '',
  rg: '',
  photo_url: '',
  photo_body_url: '',
  // ── Endereço (campos separados) ─────────────────────
  zip_code: '',
  street: '',
  address_number: '',
  neighborhood: '',
  city: '',
  state: '',
  // ── Região de atuação ───────────────────────────────
  coverage_regions: [],
  coverage_latitude: null,
  coverage_longitude: null,
  // ── Qualificações ───────────────────────────────────
  qualifications: [],
  bio: '',
  // ── Documentos ──────────────────────────────────────
  cnh_url: '',
  cnh_expiry: '',
  crlv_url: '',
  crlv_expiry: '',
  crlv_vehicle_type: '',
  address_proof_url: '',
  id_holding_document_url: '',
  background_check_url: '',
  // ── Serviços (sem preço por hora) ───────────────────
  serviceOfferings: [{ serviceType: '' }],
  // ── Agenda ──────────────────────────────────────────
  schedule: createDefaultSchedule(),
  acceptsHomologation: false,
};

export function parseServiceOfferings(provider) {
  if (!provider?.service_hourly_rates_json) return [];
  try {
    const parsed = JSON.parse(provider.service_hourly_rates_json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseProviderAddress(provider) {
  const raw = (provider?.address || '').trim();
  if (!raw) return { street: '', address_number: '' };
  const match = raw.match(/^(.+),\s*(.+)$/);
  if (match) {
    return { street: match[1].trim(), address_number: match[2].trim() };
  }
  return { street: raw, address_number: '' };
}

function formatZipCode(value) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 8);
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return digits;
}

export function providerToForm(provider, availabilities = []) {
  const offerings = parseServiceOfferings(provider);
  const { street, address_number } = parseProviderAddress(provider);

  return {
    ...DEFAULT_PROVIDER_FORM,
    email: provider?.email || '',
    name: provider?.name || '',
    phone: provider?.phone || '',
    birth_date: provider?.birth_date || '',
    cpf: provider?.cpf || '',
    rg: provider?.rg || '',
    photo_url: provider?.photo_url || '',
    photo_body_url: provider?.photo_body_url || '',
    zip_code: formatZipCode(provider?.zip_code),
    street,
    address_number,
    neighborhood: provider?.neighborhood || '',
    city: provider?.city || '',
    state: provider?.state || '',
    coverage_regions: provider?.coverage_regions ?? [],
    coverage_latitude: provider?.latitude ?? null,
    coverage_longitude: provider?.longitude ?? null,
    bio: provider?.bio || '',
    cnh_url: provider?.cnh_url || '',
    cnh_expiry: provider?.cnh_expiry || '',
    crlv_url: provider?.crlv_url || '',
    crlv_expiry: provider?.crlv_expiry || '',
    crlv_vehicle_type: provider?.crlv_vehicle_type || '',
    address_proof_url: provider?.address_proof_url || '',
    id_holding_document_url: provider?.id_holding_document_url || '',
    background_check_url: provider?.background_check_url || '',
    serviceOfferings: offerings.length
      ? offerings.map((o) => ({ serviceType: o.service_type || o.serviceType })).filter((o) => o.serviceType)
      : [{ serviceType: '' }],
    schedule: availabilityToSchedule(availabilities),
    password: '',
    confirmPassword: '',
  };
}

async function buildProviderPayload(form, validOfferings, { isCreate = false, existingProvider = null } = {}) {
  const catalogRows = await base44.entities.OfferedService.list('sort_order', 300);
  const specialties = validOfferings.map((o) => getProviderServiceLabel(o.serviceType, catalogRows));
  const addressLine = form.street?.trim()
    ? `${form.street.trim()}, ${form.address_number?.trim() || 'S/N'}`
    : (form.address?.trim() || '');

  const payload = {
    name: form.name.trim(),
    phone: form.phone.trim(),
    email: form.email?.trim() || undefined,
    birth_date: form.birth_date || undefined,
    cpf: form.cpf?.trim() || undefined,
    rg: form.rg?.trim() || undefined,
    photo_url: form.photo_url || undefined,
    photo_body_url: form.photo_body_url || undefined,
    address: addressLine,
    neighborhood: form.neighborhood?.trim() || undefined,
    city: form.city.trim(),
    state: form.state.trim().toUpperCase(),
    zip_code: form.zip_code.trim().replace(/\D/g, ''),
    coverage_regions: form.coverage_regions ?? [],
    latitude: form.coverage_latitude ?? null,
    longitude: form.coverage_longitude ?? null,
    qualifications: Array.isArray(form.qualifications)
      ? form.qualifications.join(', ')
      : (form.qualifications || ''),
    bio: form.bio?.trim() || undefined,
    specialties,
    service_hourly_rates_json: JSON.stringify(
      validOfferings.map((o) => ({
        service_type: o.serviceType,
        label: getProviderServiceLabel(o.serviceType, catalogRows),
        hourly_rate: 0,
      })),
    ),
  };

  for (const def of Object.values(PROVIDER_DOCUMENT_FIELD_MAP)) {
    const url = form[def.urlKey];
    if (!url) continue;
    payload[def.urlKey] = url;
    const prevUrl = existingProvider?.[def.urlKey];
    if (isCreate || url !== prevUrl) {
      payload[def.statusKey] = def.defaultStatus === 'nao_enviado' ? 'pendente' : 'pendente';
      payload[def.rejectionKey] = '';
    }
  }
  if (form.crlv_vehicle_type) payload.crlv_vehicle_type = form.crlv_vehicle_type;
  if (form.cnh_expiry) payload.cnh_expiry = form.cnh_expiry;
  if (form.crlv_expiry) payload.crlv_expiry = form.crlv_expiry;

  if (isCreate) {
    payload.is_online = false;
    payload.is_approved = false;
    payload.rating = 5;
    payload.total_reviews = 0;
    payload.total_jobs = 0;
  }

  return payload;
}

async function syncAdminProviderAuth(form, userId) {
  if (!form.email?.trim() || !form.password) return userId || null;
  const result = await invokeFunction('adminManageProviderAuth', {
    email: form.email.trim(),
    password: form.password,
    user_id: userId || undefined,
    full_name: form.name.trim(),
  });
  return result?.user_id || userId || null;
}

async function replaceProviderAvailability(providerId, schedule) {
  const existing = await filterProviderAvailability({ provider_id: providerId });
  await Promise.all(existing.map((row) => deleteProviderAvailability(row.id)));
  const records = scheduleToAvailabilityRecords(normalizeSchedule(schedule), providerId);
  await Promise.all(records.map((record) => createProviderAvailability(record)));
}

export async function validateProviderForm(form, { mode = 'self' } = {}) {
  const errors = [];

  // Fetch dynamic config
  let requiredFields = [];
  try {
    const configs = await listProviderConfig();
    if (configs?.[0]?.required_fields) {
      requiredFields = configs[0].required_fields;
    }
  } catch (e) {
    console.warn('Could not fetch ProviderConfig, using defaults', e);
  }

  const isRequired = (field) => {
    // Campos sempre obrigatórios
    if (['name', 'phone', 'zip_code', 'street', 'city', 'state'].includes(field)) return true;
    return requiredFields.includes(field);
  };

  // ── Acesso (auto-cadastro) ──
  if (mode === 'self') {
    if (!form.email?.trim()) errors.push('Informe o e-mail de acesso.');
    if (!form.password || form.password.length < 6) errors.push('A senha deve ter ao menos 6 caracteres.');
    if (form.password !== form.confirmPassword) errors.push('As senhas não coincidem.');
  }

  // ── Acesso (admin cria) ──
  if (mode === 'admin') {
    if (!form.email?.trim()) errors.push('Informe o e-mail de acesso.');
    if (!form.password || form.password.length < 6) errors.push('A senha deve ter ao menos 6 caracteres.');
    if (form.password !== form.confirmPassword) errors.push('As senhas não coincidem.');
  }

  // ── Acesso (admin edita) ──
  if (mode === 'admin-edit') {
    if (!form.email?.trim()) errors.push('Informe o e-mail de acesso.');
    const wantsPassword = Boolean(form.password || form.confirmPassword);
    if (wantsPassword) {
      if (!form.password || form.password.length < 6) errors.push('A senha deve ter ao menos 6 caracteres.');
      if (form.password !== form.confirmPassword) errors.push('As senhas não coincidem.');
    }
  }

  if (!form.name?.trim()) errors.push('Informe o nome do prestador.');
  if (!form.phone?.trim() || form.phone.length < 8) errors.push('Informe um telefone válido.');

  // ── Região de atuação ──
  if (!form.coverage_regions?.length) errors.push('Informe ao menos uma região de atuação.');

  if (isRequired('birth_date') && !form.birth_date) errors.push('Informe a data de nascimento.');
  if (isRequired('cpf')) {
    if (!form.cpf?.trim() || form.cpf.replace(/\D/g, '').length < 11) errors.push('Informe um CPF válido.');
  }
  if (isRequired('rg') && !form.rg?.trim()) errors.push('Informe o RG.');
  if (isRequired('email') && !form.email?.trim() && mode !== 'self') {
    errors.push('Informe o e-mail de acesso.');
  }
  if (isRequired('photo_url') && !form.photo_url) errors.push('Envie a foto de rosto.');
  if (isRequired('photo_body_url') && !form.photo_body_url) errors.push('Envie a foto de corpo inteiro.');
  if (isRequired('bio') && !form.bio?.trim()) errors.push('Preencha as observações.');

  for (const [configKey, def] of Object.entries(PROVIDER_DOCUMENT_FIELD_MAP)) {
    if (isRequired(configKey) && !form[def.urlKey]) {
      errors.push(`Envie o documento: ${def.label}.`);
    }
  }
  if (isRequired('crlv_vehicle_type') && !form.crlv_vehicle_type) {
    errors.push('Informe se o veículo é carro ou moto.');
  }

  // ── Endereço ──
  if (!form.zip_code?.trim()) errors.push('Informe o CEP.');
  if (!form.street?.trim()) errors.push('Informe a rua/logradouro.');
  if (!form.city?.trim()) errors.push('Informe a cidade.');
  if (!form.state?.trim()) errors.push('Informe o estado (UF).');

  if (mode === 'self') {
    if (!form.acceptsHomologation) errors.push('Aceite o processo de homologação para continuar.');
  }

  // ── Serviços (só tipo, sem preço) ──
  const validOfferings = (form.serviceOfferings ?? []).filter((o) => o.serviceType);
  if (validOfferings.length === 0) {
    errors.push('Selecione ao menos um tipo de serviço.');
  }

  // ── Agenda ──
  const schedule = normalizeSchedule(form.schedule);
  const scheduleErrors = validateSchedule(schedule);
  errors.push(...scheduleErrors);

  return { errors, validOfferings };
}

export async function registerProvider({ form, userId, autoApprove = false, mode = 'self' }) {
  const { errors, validOfferings } = await validateProviderForm(form, { mode });
  if (errors.length) throw new Error(errors[0]);

  let resolvedUserId = userId;

  if (mode === 'self' && !resolvedUserId) {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
    });

    if (signUpError) {
      if (signUpError.message?.toLowerCase().includes('already registered')) {
        throw new Error('Este e-mail já está cadastrado. Faça login ou use outro e-mail.');
      }
      throw new Error(signUpError.message || 'Erro ao criar conta. Tente novamente.');
    }

    resolvedUserId = signUpData?.user?.id;
    if (!resolvedUserId) {
      throw new Error('Não foi possível criar a conta. Tente novamente.');
    }
  }

  if (mode === 'admin') {
    resolvedUserId = await syncAdminProviderAuth(form, resolvedUserId);
  }

  const payload = await buildProviderPayload(form, validOfferings, { isCreate: true });
  if (resolvedUserId) payload.user_id = resolvedUserId;

  const provider = await createProvider(payload);

  if (resolvedUserId && mode === 'self') {
    await supabase
      .from('profiles')
      .update({ role: 'provider' })
      .eq('id', resolvedUserId);
  }

  await replaceProviderAvailability(provider.id, form.schedule);
  return provider;
}

export async function updateProviderRecord({ form, providerId, userId }) {
  const { errors, validOfferings } = await validateProviderForm(form, { mode: 'admin-edit' });
  if (errors.length) throw new Error(errors[0]);

  const current = await getProvider(providerId);
  if (!current) throw new Error('Prestador não encontrado.');

  let resolvedUserId = userId || current.user_id || null;
  resolvedUserId = await syncAdminProviderAuth(form, resolvedUserId);

  const payload = await buildProviderPayload(form, validOfferings, { existingProvider: current });
  if (resolvedUserId) payload.user_id = resolvedUserId;

  const provider = await updateProvider(providerId, payload);
  await replaceProviderAvailability(providerId, form.schedule);
  return provider;
}
