import { slugifyServiceName } from '@/lib/offeredServices';

export const DEFAULT_OFFERED_SERVICE_GROUPS = [
  { slug: 'casa', label: 'Casa', emoji: '🏠', sort_order: 0 },
  { slug: 'veiculo', label: 'Veículo', emoji: '🚗', sort_order: 1 },
];

export function slugifyGroupLabel(label) {
  return slugifyServiceName(label || 'grupo');
}

export function formatGroupTabLabel(group) {
  if (!group) return '';
  if (group.emoji) return `${group.emoji} ${group.label}`;
  return group.label;
}

/** Abas de filtro: Todos + grupos ativos ordenados */
export function buildGroupFilterTabs(groups = []) {
  return [
    { id: 'all', label: 'Todos' },
    ...groups.map((group) => ({
      id: group.slug,
      label: formatGroupTabLabel(group),
    })),
  ];
}

/** Agrupa serviços do prestador conforme catálogo de grupos */
export function groupProviderServices(services = [], groups = []) {
  const activeGroups = groups.length > 0 ? groups : DEFAULT_OFFERED_SERVICE_GROUPS;
  const labelBySlug = Object.fromEntries(
    activeGroups.map((g) => [g.slug, formatGroupTabLabel(g)]),
  );
  const order = activeGroups.map((g) => g.slug);

  const bucket = new Map();
  for (const svc of services) {
    const key = svc.serviceGroup || svc.service_group || activeGroups[0]?.slug || 'casa';
    if (!bucket.has(key)) bucket.set(key, []);
    bucket.get(key).push(svc);
  }

  const ordered = order
    .filter((slug) => bucket.has(slug))
    .map((slug) => ({
      key: slug,
      label: labelBySlug[slug] || slug,
      items: bucket.get(slug),
    }));

  const extras = [...bucket.keys()]
    .filter((slug) => !order.includes(slug))
    .map((slug) => ({
      key: slug,
      label: labelBySlug[slug] || slug.replace(/_/g, ' '),
      items: bucket.get(slug),
    }));

  return [...ordered, ...extras];
}

export function getDefaultServiceGroupSlug(groups = []) {
  return groups[0]?.slug ?? DEFAULT_OFFERED_SERVICE_GROUPS[0].slug;
}
