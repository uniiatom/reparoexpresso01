import 'package:go_router/go_router.dart';
import 'package:reparo_shared/reparo_shared.dart';

import 'screens/active_job_screen.dart';
import 'screens/agenda_screen.dart';
import 'screens/earnings_screen.dart';
import 'screens/jobs_screen.dart';
import 'screens/login_screen.dart';
import 'screens/metrics_screen.dart';
import 'screens/provider_documents_screen.dart';
import 'screens/provider_profile_screen.dart';
import 'screens/queue_screen.dart';
import 'screens/splash_screen.dart';
import 'screens/support_ticket_screen.dart';

/// Mesma estratégia de guarda de auth do app cliente — ver
/// `apps/client/lib/router.dart` (comentário completo lá).
GoRouter buildRouter(AuthController authController) {
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
      if (loggingIn || state.matchedLocation == '/splash') {
        return '/queue';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (context, state) => const SplashScreen()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/queue', builder: (context, state) => const QueueScreen()),
      GoRoute(path: '/jobs', builder: (context, state) => const JobsScreen()),
      GoRoute(
        path: '/jobs/detail',
        builder: (context, state) => ActiveJobScreen(job: state.extra! as ServiceRequest),
      ),
      GoRoute(path: '/earnings', builder: (context, state) => const EarningsScreen()),
      GoRoute(path: '/profile', builder: (context, state) => const ProviderProfileScreen()),
      GoRoute(
        path: '/documents',
        builder: (context, state) => ProviderDocumentsScreen(providerId: state.extra! as String),
      ),
      GoRoute(
        path: '/agenda',
        builder: (context, state) => AgendaScreen(providerId: state.extra! as String),
      ),
      GoRoute(
        path: '/support/new',
        builder: (context, state) => SupportTicketScreen(providerId: state.extra! as String),
      ),
      GoRoute(
        path: '/metrics',
        builder: (context, state) => MetricsScreen(providerId: state.extra! as String),
      ),
    ],
  );
}
