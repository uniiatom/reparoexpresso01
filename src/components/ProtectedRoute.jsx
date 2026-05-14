import { Outlet } from 'react-router-dom';
import RequireAuth from '@/components/auth/RequireAuth';

/**
 * Layout de rotas autenticadas (use como `element` pai no React Router).
 * Equivale a `<RequireAuth><Outlet /></RequireAuth>`.
 */
export default function ProtectedRoute() {
  return (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  );
}
