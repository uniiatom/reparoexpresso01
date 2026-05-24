import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { hasAnyRole } from '@/lib/auth/roles';
import AppLoadingScreen from '@/components/ui/AppLoadingScreen';

/**
 * Rota aninhada: só renderiza `<Outlet />` se o usuário tiver um dos papéis.
 */
export default function RoleRoute({ allow, fallbackTo = '/inicio' }) {
  const { user, isLoadingAuth, isAuthenticated } = useAuth();

  if (isLoadingAuth) {
    return <AppLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!hasAnyRole(user, allow)) {
    return <Navigate to={fallbackTo} replace />;
  }

  return <Outlet />;
}
