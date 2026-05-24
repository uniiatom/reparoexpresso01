import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabase/client';
import { getServiceLabel } from '@/lib/constants/providerServiceTypes';

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
  address: '',
  neighborhood: '',
  city: '',
  state: '',
  zip_code: '',
  // ── Região de atuação ───────────────────────────────
  coverage_regions: [],
  coverage_latitude: null,
  coverage_longitude: null,
  // ── Qualificações ───────────────────────────────────
  qualifications: '',
  experience_years: '',
  bio: '',
  serviceOfferings: [{ serviceType: '', hourlyRate: '' }],
  schedule: {
    days: [1, 2, 3, 4, 5],
    startTime: '08:00',
    endTime: '18:00',
    maxSlotsPerDay: 5,
  },
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

export async function validateProviderForm(form, { mode = 'self' } = {}) {
  const errors = [];
  
  // Fetch dynamic config
  let requiredFields = [];
  try {
    const configs = await base44.entities.ProviderConfig.list();
    if (configs?.[0]?.required_fields) {
      requiredFields = configs[0].required_fields;
    }
  } catch (e) {
    console.warn('Could not fetch ProviderConfig, using defaults', e);
  }

  const isRequired = (field) => {
    // Default required fields
    if (['name', 'phone', 'address', 'city', 'state', 'zip_code', 'qualifications', 'experience_years'].includes(field)) return true;
    return requiredFields.includes(field);
  };

  // ── Acesso (somente auto-cadastro) ──
  if (mode === 'self') {
    if (!form.email?.trim()) errors.push('Informe o e-mail de acesso.');
    if (!form.password || form.password.length < 6) errors.push('A senha deve ter ao menos 6 caracteres.');
    if (form.password !== form.confirmPassword) errors.push('As senhas não coincidem.');
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

  if (!form.address?.trim()) errors.push('Informe o endereço (rua e número).');
  if (!form.city?.trim()) errors.push('Informe a cidade.');
  if (!form.state?.trim()) errors.push('Informe o estado (UF).');
  if (!form.zip_code?.trim()) errors.push('Informe o CEP.');

  if (mode === 'self') {
    if (!form.acceptsHomologation) errors.push('Aceite o processo de homologação para continuar.');
  }

  if (!form.qualifications || (Array.isArray(form.qualifications) && form.qualifications.length === 0)) {
    errors.push('Selecione ao menos uma qualificação do prestador.');
  }
  
  if (!form.experience_years && form.experience_years !== 0) errors.push('Informe os anos de experiência.');

  const validOfferings = (form.serviceOfferings ?? []).filter(
    (o) => o.serviceType && o.hourlyRate !== '' && Number(o.hourlyRate) > 0,
  );
  if (validOfferings.length === 0) {
    errors.push('Adicione ao menos um tipo de serviço com preço por hora.');
  }

  if (!form.schedule?.days?.length) errors.push('Selecione ao menos um dia de atendimento.');
  
  // Support for multiple slots
  if (form.schedule?.slots?.length > 0) {
    form.schedule.slots.forEach((slot, i) => {
      if (!slot.startTime || !slot.endTime) {
        errors.push(`Informe o horário de início e fim para o slot ${i+1}.`);
      }
    });
  } else if (!form.schedule?.startTime || !form.schedule?.endTime) {
    errors.push('Informe o horário de início e fim do atendimento.');
  }

  return { errors, validOfferings };
}

export async function registerProvider({ form, userId, autoApprove = false, mode = 'self' }) {
  const { errors, validOfferings } = await validateProviderForm(form, { mode });
  if (errors.length) throw new Error(errors[0]);

  // ── Cria conta Supabase Auth (apenas no auto-cadastro sem userId existente) ──
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

  const specialties = validOfferings.map((o) => getServiceLabel(o.serviceType));

  const payload = {
    user_id: resolvedUserId || undefined,
    name: form.name.trim(),
    phone: form.phone.trim(),
    email: form.email?.trim() || undefined,
    birth_date: form.birth_date || undefined,
    cpf: form.cpf?.trim() || undefined,
    rg: form.rg?.trim() || undefined,
    photo_url: form.photo_url || undefined,
    photo_body_url: form.photo_body_url || undefined,
    address: form.address.trim(),
    neighborhood: form.neighborhood?.trim() || undefined,
    city: form.city.trim(),
    state: form.state.trim().toUpperCase(),
    zip_code: form.zip_code.trim(),
    coverage_regions: form.coverage_regions ?? [],
    ...(form.coverage_latitude != null && { latitude: form.coverage_latitude }),
    ...(form.coverage_longitude != null && { longitude: form.coverage_longitude }),
    qualifications: Array.isArray(form.qualifications) ? form.qualifications.join(', ') : (form.qualifications || ''),
    bio: form.bio?.trim() || undefined,
    experience_years: Number(form.experience_years) || 0,
    specialties,
    service_hourly_rates_json: JSON.stringify(
      validOfferings.map((o) => ({
        service_type: o.serviceType,
        label: getServiceLabel(o.serviceType),
        hourly_rate: Number(o.hourlyRate),
      })),
    ),
    is_online: false,
    is_approved: Boolean(autoApprove),
    rating: 5,
    total_reviews: 0,
    total_jobs: 0,
  };

  const provider = await base44.entities.Provider.create(payload);

  const { days, maxSlotsPerDay, slots = [] } = form.schedule;
  
  // Create availability for each day and each slot
  const availabilityPromises = [];
  days.forEach(day => {
    if (slots.length > 0) {
      slots.forEach(slot => {
        if (slot.startTime && slot.endTime) {
          availabilityPromises.push(
            base44.entities.ProviderAvailability.create({
              provider_id: provider.id,
              day_of_week: day,
              start_time: slot.startTime,
              end_time: slot.endTime,
              is_available: true,
              max_slots_per_day: Number(maxSlotsPerDay) || 5,
            })
          );
        }
      });
    } else if (form.schedule.startTime && form.schedule.endTime) {
      // Fallback for legacy format
      availabilityPromises.push(
        base44.entities.ProviderAvailability.create({
          provider_id: provider.id,
          day_of_week: day,
          start_time: form.schedule.startTime,
          end_time: form.schedule.endTime,
          is_available: true,
          max_slots_per_day: Number(maxSlotsPerDay) || 5,
        })
      );
    }
  });

  await Promise.all(availabilityPromises);

  return provider;
}
