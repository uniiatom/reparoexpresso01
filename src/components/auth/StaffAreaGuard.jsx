import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { ROLES } from '@/lib/auth/roles';

/** Rotas permitidas para admin/atendente (fora do /admin com tabs). */
export const STAFF_ALLOWED_PREFIXES = [
  '/admin',
  '/dashboard-admin',
  '/premiacao',
  '/agenda',
  '/perfil',
];

export function isStaffAllowedPath(pathname) {
  return STAFF_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Admin e atendente só devem navegar na área administrativa.
 * Qualquer outra rota autenticada redireciona para /admin.
 */
export default function StaffAreaGuard({ children }) {
  const { user, isLoadingAuth } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) return children;

  const isStaff = user?.role === ROLES.ADMIN || user?.role === ROLES.ATTENDANT;
  if (!isStaff) return children;

  if (isStaffAllowedPath(location.pathname)) return children;

  return <Navigate to="/admin" replace state={{ from: location.pathname }} />;
}
