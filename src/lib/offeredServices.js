import {
  Zap, Droplets, Wrench, Lock, Wind, Hammer, Monitor, Car, Battery, Power, Pin,
} from 'lucide-react';
import { SERVICE_TYPES } from '@/lib/serviceTypes';

export const OFFERED_SERVICE_ICON_MAP = {
  Zap,
  Droplets,
  Wrench,
  Lock,
  Wind,
  Hammer,
  Monitor,
  Car,
  Battery,
  Power,
  Pin,
};

export function getOfferedServiceIcon(iconKey, fallback = Wrench) {
  return OFFERED_SERVICE_ICON_MAP[iconKey] || fallback;
}

export function slugifyServiceName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

export function formatPrice(value) {
  if (value == null || Number.isNaN(Number(value))) return 'Sob consulta';
  return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

/** Converte registro do banco para formato usado na solicitação de serviço. */
export function mapOfferedServiceToPickerItem(row) {
  const legacy = SERVICE_TYPES.find((s) => s.value === row.slug);
  return {
    value: row.slug,
    label: row.name,
    group: row.service_group,
    icon: getOfferedServiceIcon(row.icon_key, legacy?.icon),
    image_url: row.image_url,
    average_price: row.average_price,
    estimated_duration_minutes: row.estimated_duration_minutes,
    description: row.description,
    field_values: row.field_values ?? {},
    extra_field_definitions: row.extra_field_definitions ?? [],
    needsTvSize: legacy?.needsTvSize,
    source: 'catalog',
  };
}

export function mergePickerServices(catalogRows = []) {
  const fromDb = catalogRows.map(mapOfferedServiceToPickerItem);
  if (fromDb.length > 0) return fromDb;
  return SERVICE_TYPES;
}

/** Opção de serviço para cadastro/configuração de prestadores (slug + nome). */
export function mapOfferedServiceToProviderOption(row) {
  return {
    value: row.slug,
    label: row.name,
    serviceGroup: row.service_group,
    isActive: row.is_active !== false,
  };
}

/** Lista de serviços para prestadores a partir do catálogo admin; fallback legado se vazio. */
export function buildProviderServiceOptions(catalogRows = []) {
  const fromCatalog = (catalogRows ?? []).map(mapOfferedServiceToProviderOption);
  if (fromCatalog.length > 0) return fromCatalog;

  return [
    { value: 'eletrica', label: 'Elétrica', serviceGroup: 'casa', isActive: true },
    { value: 'hidraulica', label: 'Hidráulica', serviceGroup: 'casa', isActive: true },
    { value: 'fechadura', label: 'Fechadura', serviceGroup: 'casa', isActive: true },
    { value: 'ar_condicionado', label: 'Ar Condicionado', serviceGroup: 'casa', isActive: true },
    { value: 'reparo_geral', label: 'Reparo Geral', serviceGroup: 'casa', isActive: true },
    { value: 'troca_pneu', label: 'Troca de Pneu', serviceGroup: 'veiculo', isActive: true },
    { value: 'recarga_bateria', label: 'Recarga de Bateria', serviceGroup: 'veiculo', isActive: true },
    { value: 'reboque', label: 'Reboque', serviceGroup: 'veiculo', isActive: true },
    { value: 'outros', label: 'Outros', serviceGroup: 'casa', isActive: true },
  ];
}

/** Aplica allowed_services do ProviderConfig (slugs); vazio = todos ativos permitidos. */
export function resolveAllowedProviderServices(allOptions, allowedSlugs, { activeOnly = true } = {}) {
  let list = allOptions ?? [];
  if (activeOnly) list = list.filter((o) => o.isActive !== false);
  if (!allowedSlugs?.length) return list;
  return list.filter((o) => allowedSlugs.includes(o.value));
}

export function getProviderServiceLabel(value, catalogRows = []) {
  const fromCatalog = catalogRows.find((row) => row.slug === value);
  if (fromCatalog?.name) return fromCatalog.name;
  const legacy = SERVICE_TYPES.find((s) => s.value === value);
  if (legacy?.label) return legacy.label;
  return value?.replace(/_/g, ' ') ?? value;
}

export const FIELD_TYPE_LABELS = {
  text: 'Texto curto',
  number: 'Número',
  textarea: 'Texto longo',
  boolean: 'Sim / Não',
  select: 'Lista de opções',
};
