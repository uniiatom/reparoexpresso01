import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/wallet_bonus.dart';

/// RLS de `wallet_bonuses` libera `is_staff()` ou o próprio `owner_id`.
class WalletBonusRepository {
  WalletBonusRepository(this._client);

  final SupabaseClient _client;

  Future<List<WalletBonus>> listFor(String ownerId) async {
    final data = await _client
        .from('wallet_bonuses')
        .select()
        .eq('owner_id', ownerId)
        .order('created_at', ascending: false);
    return data.map(WalletBonus.fromJson).toList();
  }
}
