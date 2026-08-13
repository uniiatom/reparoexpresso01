import 'package:go_router/go_router.dart';
import 'package:reparo_shared/reparo_shared.dart';

import 'screens/dossie_screen.dart';
import 'screens/favorites_screen.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'screens/loyalty_screen.dart';
import 'screens/notifications_screen.dart';
import 'screens/order_detail_screen.dart';
import 'screens/orders_screen.dart';
import 'screens/payment_screen.dart';
import 'screens/preventive_reminders_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/recurring_services_screen.dart';
import 'screens/referral_screen.dart';
import 'screens/register_screen.dart';
import 'screens/request_screen.dart';
import 'screens/splash_screen.dart';
import 'screens/support_ticket_screen.dart';
import 'screens/wallet_screen.dart';

/// Equivalente Flutter do `ProtectedRoute`/`RequireAuth` do `legacy/`:
/// rotas fora de `/login` e `/register` exigem sessão ativa.
GoRouter buildRouter(AuthController authController) {
  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: authController,
    redirect: (context, state) {
      if (authController.isLoading) {
        return state.matchedLocation == '/splash' ? null : '/splash';
      }

      final loggingIn = state.matchedLocation == '/login' || state.matchedLocation == '/register';

      if (!authController.isAuthenticated) {
        return loggingIn ? null : '/login';
      }
      if (loggingIn || state.matchedLocation == '/splash') {
        return '/home';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (context, state) => const SplashScreen()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
      GoRoute(path: '/home', builder: (context, state) => const HomeScreen()),
      GoRoute(path: '/orders', builder: (context, state) => const OrdersScreen()),
      GoRoute(
        path: '/orders/detail',
        builder: (context, state) => OrderDetailScreen(order: state.extra! as ServiceRequest),
      ),
      GoRoute(
        path: '/request',
        builder: (context, state) => RequestScreen(profession: state.extra! as Profession),
      ),
      GoRoute(
        path: '/payment',
        builder: (context, state) => PaymentScreen(request: state.extra! as ServiceRequest),
      ),
      GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
      GoRoute(path: '/wallet', builder: (context, state) => const WalletScreen()),
      GoRoute(path: '/favorites', builder: (context, state) => const FavoritesScreen()),
      GoRoute(path: '/loyalty', builder: (context, state) => const LoyaltyScreen()),
      GoRoute(path: '/referral', builder: (context, state) => const ReferralScreen()),
      GoRoute(path: '/notifications', builder: (context, state) => const NotificationsScreen()),
      GoRoute(path: '/support/new', builder: (context, state) => const SupportTicketScreen()),
      GoRoute(path: '/reminders', builder: (context, state) => const PreventiveRemindersScreen()),
      GoRoute(path: '/recurring', builder: (context, state) => const RecurringServicesScreen()),
      GoRoute(path: '/dossie', builder: (context, state) => const DossieScreen()),
    ],
  );
}
