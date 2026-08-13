import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/cashback.dart';

/// Porta de `legacy/src/components/CashbackPanel.jsx`.
class CashbackRepository {
  CashbackRepository(this._client);

  final SupabaseClient _client;

  Future<List<Cashback>> listMine() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return const [];
    final data = await _client
        .from('cashbacks')
        .select()
        .eq('owner_id', uid)
        .order('created_at', ascending: false);
    return data.map(Cashback.fromJson).toList();
  }

  /// Resgata cashbacks disponíveis via PIX (transferência pra carteira) —
  /// via Edge Function `processCashbackRedemption`.
  Future<void> redeemToPix(List<String> cashbackIds) async {
    await _client.functions.invoke('processCashbackRedemption', body: {
      'cashbackIds': cashbackIds,
      'redemptionType': 'pix',
    });
  }
}
