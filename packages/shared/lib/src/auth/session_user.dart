import 'package:supabase_flutter/supabase_flutter.dart' show User;

import 'app_role.dart';
import 'profile.dart';

/// Formato de usuário logado usado pelos 3 apps — equivalente a
/// `legacy/src/lib/auth/mapSessionUser.js` (que por sua vez mantinha
/// compatibilidade com o antigo `base44.auth.me()`).
class SessionUser {
  const SessionUser({
    required this.id,
    this.email,
    required this.fullName,
    this.avatarUrl,
    required this.role,
  });

  final String id;
  final String? email;
  final String fullName;
  final String? avatarUrl;
  final AppRole role;

  static SessionUser? fromSupabase(User? sessionUser, Profile? profile) {
    if (sessionUser == null) return null;

    final role = profile?.role ?? AppRole.user;
    final metadataFullName = sessionUser.userMetadata?['full_name'] as String?;
    final emailLocalPart = sessionUser.email?.split('@').first;

    return SessionUser(
      id: sessionUser.id,
      email: sessionUser.email ?? profile?.email,
      fullName: profile?.fullName ?? metadataFullName ?? emailLocalPart ?? '',
      avatarUrl: profile?.avatarUrl,
      role: role,
    );
  }
}
