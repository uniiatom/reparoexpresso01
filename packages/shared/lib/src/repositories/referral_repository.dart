import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/referral.dart';

/// Porta de `legacy/src/components/ReferralCard.jsx`.
class ReferralRepository {
  ReferralRepository(this._client);

  final SupabaseClient _client;

  /// Indicações feitas por este usuário (estatísticas de pendentes vs.
  /// convertidas — o código em si mora em `clients.referral_code`).
  Future<List<Referral>> listMine() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return const [];
    final data = await _client
        .from('referrals')
        .select()
        .eq('referrer_id', uid)
        .order('created_at', ascending: false);
    return data.map(Referral.fromJson).toList();
  }
}
