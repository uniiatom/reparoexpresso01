import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/cashback_config.dart';

/// RLS de `cashback_configs` libera SELECT pra qualquer autenticado;
/// escrita é admin-only (fica a cargo do painel admin, ver Fase 5).
class CashbackConfigRepository {
  CashbackConfigRepository(this._client);

  final SupabaseClient _client;

  Future<List<CashbackConfig>> list() async {
    final data = await _client.from('cashback_configs').select().order('nivel');
    return data.map(CashbackConfig.fromJson).toList();
  }
}
