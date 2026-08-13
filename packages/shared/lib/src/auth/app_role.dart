/// Papéis canônicos — espelha `public.app_role` no Postgres e
/// `legacy/src/lib/auth/roles.js`.
enum AppRole {
  user,
  provider,
  admin,
  attendant,
  partner;

  String get value => name;

  static AppRole? fromString(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    // Compatibilidade com código legado que usava `prestador`.
    final normalized = raw == 'prestador' ? 'provider' : raw;
    for (final role in AppRole.values) {
      if (role.value == normalized) return role;
    }
    return null;
  }
}

bool hasAnyRole(AppRole? role, List<AppRole> allowed) {
  if (role == null) return false;
  return allowed.contains(role);
}
