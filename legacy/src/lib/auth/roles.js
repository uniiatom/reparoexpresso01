/** Papéis canônicos (PRD §2 + migração Supabase). */
export const ROLES = {
  USER: 'user',
  PROVIDER: 'provider',
  ADMIN: 'admin',
  ATTENDANT: 'attendant',
  PARTNER: 'partner',
};

/** Compatibilidade com código legado que usava `prestador`. */
export function normalizeRole(role) {
  if (!role) return null;
  if (role === 'prestador') return ROLES.PROVIDER;
  return role;
}

export function isProviderRole(role) {
  const r = normalizeRole(role);
  return r === ROLES.PROVIDER;
}

export function hasAnyRole(user, allowed) {
  if (!user?.role) return false;
  const r = normalizeRole(user.role);
  return allowed.map(normalizeRole).includes(r);
}
