import 'package:supabase_flutter/supabase_flutter.dart';

import '../auth/app_role.dart';
import '../auth/profile.dart';

/// Porta de `legacy/src/components/admin/AttendantsManager.jsx` — usa a
/// Edge Function `adminManageUsers` (`requireAdminOrService`), que cria
/// contas de verdade no Supabase Auth. Serve tanto pra atendentes quanto,
/// em tese, qualquer role administrativo.
class AdminUserRepository {
  AdminUserRepository(this._client);

  final SupabaseClient _client;

  Future<List<Profile>> listAll() async {
    final response = await _client.functions.invoke('adminManageUsers', body: {'action': 'list'});
    final users = (response.data as Map<String, dynamic>)['users'] as List;
    return users.map((u) => Profile.fromJson(u as Map<String, dynamic>)).toList();
  }

  Future<void> createAttendant({
    required String email,
    required String password,
    required String fullName,
    String? phone,
  }) async {
    await _client.functions.invoke('adminManageUsers', body: {
      'action': 'create',
      'email': email,
      'password': password,
      'full_name': fullName,
      'role': AppRole.attendant.value,
      'phone': phone,
    });
  }

  Future<void> setActive(String userId, {required bool active}) async {
    // O schema não tem coluna `is_active` em profiles — "desativar" aqui é
    // uma convenção simples: rebaixa pra role `user` (perde acesso ao
    // admin) em vez de deletar a conta. Reversível chamando de novo com
    // active: true.
    await _client.functions.invoke('adminManageUsers', body: {
      'action': 'update',
      'user_id': userId,
      'role': active ? AppRole.attendant.value : AppRole.user.value,
    });
  }
}
