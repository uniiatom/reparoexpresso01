import { base44 } from '@/api/base44Client';
import { getServiceLabel } from '@/lib/constants/providerServiceTypes';

export const DEFAULT_PROVIDER_FORM = {
  name: '',
  phone: '',
  email: '',
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

export function validateProviderForm(form, { mode = 'self' } = {}) {
  const errors = [];

  if (!form.name?.trim()) errors.push('Informe o nome do prestador.');
  if (!form.phone?.trim() || form.phone.length < 8) errors.push('Informe um telefone válido.');
  if (!form.address?.trim()) errors.push('Informe o endereço (rua e número).');
  if (!form.city?.trim()) errors.push('Informe a cidade.');
  if (!form.state?.trim()) errors.push('Informe o estado (UF).');
  if (!form.zip_code?.trim()) errors.push('Informe o CEP.');

  if (mode === 'self') {
    if (!form.cpf?.trim() || form.cpf.replace(/\D/g, '').length < 11) errors.push('Informe um CPF válido.');
    if (!form.rg?.trim()) errors.push('Informe o RG.');
    if (!form.birth_date) errors.push('Informe a data de nascimento.');
    if (!form.acceptsHomologation) errors.push('Aceite o processo de homologação para continuar.');
  }

  if (!form.qualifications?.trim()) errors.push('Descreva as qualificações do prestador.');
  if (!form.experience_years && form.experience_years !== 0) errors.push('Informe os anos de experiência.');

  const validOfferings = (form.serviceOfferings ?? []).filter(
    (o) => o.serviceType && o.hourlyRate !== '' && Number(o.hourlyRate) > 0,
  );
  if (validOfferings.length === 0) {
    errors.push('Adicione ao menos um tipo de serviço com preço por hora.');
  }

  if (!form.schedule?.days?.length) errors.push('Selecione ao menos um dia de atendimento.');
  if (!form.schedule?.startTime || !form.schedule?.endTime) {
    errors.push('Informe o horário de início e fim do atendimento.');
  }

  return { errors, validOfferings };
}

export async function registerProvider({ form, userId, autoApprove = false, mode = 'self' }) {
  const { errors, validOfferings } = validateProviderForm(form, { mode });
  if (errors.length) throw new Error(errors[0]);

  const specialties = validOfferings.map((o) => getServiceLabel(o.serviceType));

  const payload = {
    user_id: userId || undefined,
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
    qualifications: form.qualifications.trim(),
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

  const { days, startTime, endTime, maxSlotsPerDay } = form.schedule;
  await Promise.all(
    days.map((day) =>
      base44.entities.ProviderAvailability.create({
        provider_id: provider.id,
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
        is_available: true,
        max_slots_per_day: Number(maxSlotsPerDay) || 5,
      }),
    ),
  );

  return provider;
}
