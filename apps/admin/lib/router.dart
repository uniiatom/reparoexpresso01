import 'package:go_router/go_router.dart';
import 'package:reparo_shared/reparo_shared.dart';

import 'screens/dashboard_screen.dart';
import 'screens/forbidden_screen.dart';
import 'screens/login_screen.dart';
import 'screens/splash_screen.dart';

/// Além da guarda de auth (ver `apps/client/lib/router.dart`), o admin tem
/// uma guarda de **role**: só `admin`/`attendant` passam — é a parte
/// client-side do isolamento de acesso entre os 3 apps (a outra metade é a
/// RLS do Supabase, que já restringe os dados independente da UI).
GoRouter buildRouter(AuthController authController) {
  bool isStaffRole(AppRole role) => role == AppRole.admin || role == AppRole.attendant;

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: authController,
    redirect: (context, state) {
      if (authController.isLoading) {
        return state.matchedLocation == '/splash' ? null : '/splash';
      }

      final loggingIn = state.matchedLocation == '/login';

      if (!authController.isAuthenticated) {
        return loggingIn ? null : '/login';
      }

      if (!isStaffRole(authController.user!.role)) {
        return state.matchedLocation == '/forbidden' ? null : '/forbidden';
      }

      if (loggingIn || state.matchedLocation == '/splash' || state.matchedLocation == '/forbidden') {
        return '/dashboard';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (context, state) => const SplashScreen()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/forbidden', builder: (context, state) => const ForbiddenScreen()),
      GoRoute(path: '/dashboard', builder: (context, state) => const DashboardScreen()),
    ],
  );
}
