import 'dart:async';

import 'package:flutter/foundation.dart';

import 'auth_service.dart';
import 'session_user.dart';

/// `ChangeNotifier` fino em cima de [AuthService] — alimenta o roteador
/// (redirect por auth) e as telas de login/cadastro dos 3 apps. Equivalente
/// funcional ao `AuthContext`/`useAuth()` do `legacy/`.
class AuthController extends ChangeNotifier {
  AuthController(this._authService) {
    _subscription = _authService.sessionChanges.listen((user) {
      _user = user;
      _isLoading = false;
      notifyListeners();
    });
  }

  final AuthService _authService;
  StreamSubscription<SessionUser?>? _subscription;

  SessionUser? _user;
  SessionUser? get user => _user;

  bool _isLoading = true;

  /// `true` até a primeira leitura de sessão resolver — usar para segurar
  /// o redirect do router numa splash em vez de mandar para /login à toa.
  bool get isLoading => _isLoading;

  bool get isAuthenticated => _user != null;

  String? _error;
  String? get error => _error;

  Future<void> signIn({required String email, required String password}) async {
    _error = null;
    notifyListeners();
    try {
      await _authService.signInWithPassword(email: email, password: password);
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> signUp({
    required String email,
    required String password,
    String? fullName,
  }) async {
    _error = null;
    notifyListeners();
    try {
      await _authService.signUp(email: email, password: password, fullName: fullName);
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> signOut() => _authService.logout();

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}
