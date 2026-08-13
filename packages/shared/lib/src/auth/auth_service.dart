import 'package:supabase_flutter/supabase_flutter.dart';

import 'profile.dart';
import 'session_user.dart';

/// Substitui `base44.auth` / `legacy/src/lib/supabaseAuthAdapter.js` —
/// sessão e perfil via Supabase Auth + tabela `profiles`.
class AuthService {
  AuthService(this._client);

  final SupabaseClient _client;

  Future<Profile?> _loadProfile(String userId) async {
    final data = await _client
        .from('profiles')
        .select()
        .eq('id', userId)
        .maybeSingle();
    if (data == null) return null;
    return Profile.fromJson(data);
  }

  /// Usuário + perfil atuais. Lança se não houver sessão — mesmo
  /// comportamento do `me()` legado.
  Future<SessionUser> me() async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw StateError('Usuário não autenticado.');
    }
    final profile = await _loadProfile(user.id);
    final sessionUser = SessionUser.fromSupabase(user, profile);
    if (sessionUser == null) {
      throw StateError('Usuário não autenticado.');
    }
    return sessionUser;
  }

  /// Stream de alto nível: emite o [SessionUser] atual (ou `null`) a cada
  /// mudança de estado de auth — use para alimentar um provider/bloc de
  /// sessão em cada app.
  Stream<SessionUser?> get sessionChanges async* {
    yield await _currentSessionUserOrNull();
    await for (final state in _client.auth.onAuthStateChange) {
      final user = state.session?.user;
      if (user == null) {
        yield null;
        continue;
      }
      final profile = await _loadProfile(user.id);
      yield SessionUser.fromSupabase(user, profile);
    }
  }

  Future<SessionUser?> _currentSessionUserOrNull() async {
    final user = _client.auth.currentUser;
    if (user == null) return null;
    final profile = await _loadProfile(user.id);
    return SessionUser.fromSupabase(user, profile);
  }

  Future<AuthResponse> signInWithPassword({
    required String email,
    required String password,
  }) {
    return _client.auth.signInWithPassword(email: email, password: password);
  }

  Future<AuthResponse> signUp({
    required String email,
    required String password,
    String? fullName,
  }) {
    return _client.auth.signUp(
      email: email,
      password: password,
      data: fullName != null ? {'full_name': fullName} : null,
    );
  }

  Future<void> logout() => _client.auth.signOut();
}
