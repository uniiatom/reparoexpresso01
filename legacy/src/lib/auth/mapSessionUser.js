import { normalizeRole } from '@/lib/auth/roles';

/** Formato compatível com telas que usavam base44.auth.me(). */
export function mapSessionUser(sessionUser, profile) {
  if (!sessionUser) return null;
  const role = normalizeRole(profile?.role) ?? 'user';
  return {
    id: sessionUser.id,
    email: sessionUser.email ?? profile?.email,
    full_name:
      profile?.full_name ??
      sessionUser.user_metadata?.full_name ??
      (sessionUser.email ? sessionUser.email.split('@')[0] : ''),
    avatar_url: profile?.avatar_url ?? null,
    role,
    legacyRole: role === 'provider' ? 'prestador' : role,
  };
}
