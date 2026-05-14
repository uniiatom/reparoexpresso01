import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { hasAnyRole } from '@/lib/auth/roles';

/**
 * Rota aninhada: só renderiza `<Outlet />` se o usuário tiver um dos papéis.
 */
export default function RoleRoute({ allow, fallbackTo = '/inicio' }) {
  const { user, isLoadingAuth, isAuthenticated } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="h-9 w-9 border-2 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!hasAnyRole(user, allow)) {
    return <Navigate to={fallbackTo} replace />;
  }

  return <Outlet />;
}
