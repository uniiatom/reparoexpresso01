import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/customer_loyalty.dart';

/// Porta de `legacy/src/pages/LoyaltyRewards.jsx`.
class LoyaltyRepository {
  LoyaltyRepository(this._client);

  final SupabaseClient _client;

  /// Mesmos tiers fixos do legado (`REWARD_TIERS` em `LoyaltyRewards.jsx`):
  /// pontos -> valor de desconto em reais.
  static const rewardTiers = <int, int>{
    100: 10,
    250: 30,
    500: 70,
    1000: 160,
  };

  Future<CustomerLoyalty?> findMine() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return null;
    final data = await _client
        .from('customer_loyalty')
        .select()
        .eq('client_id', uid)
        .maybeSingle();
    return data == null ? null : CustomerLoyalty.fromJson(data);
  }

  Future<List<LoyaltyTransaction>> listMyTransactions() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return const [];
    final data = await _client
        .from('loyalty_transactions')
        .select()
        .eq('client_id', uid)
        .order('created_at', ascending: false);
    return data.map(LoyaltyTransaction.fromJson).toList();
  }

  /// Atribuição manual de pontos pelo admin — porta de
  /// `AdditionalPointsAdmin.jsx`. RLS de `customer_loyalty`/
  /// `loyalty_transactions` libera `is_staff()` pra qualquer `client_id`.
  Future<void> grantPoints({
    required String clientId,
    required int points,
    required String reason,
  }) async {
    final existing = await _client
        .from('customer_loyalty')
        .select()
        .eq('client_id', clientId)
        .maybeSingle();

    final newTotal = (existing?['total_points'] as int? ?? 0) + points;
    final newAvailable = (existing?['available_points'] as int? ?? 0) + points;

    if (existing == null) {
      await _client.from('customer_loyalty').insert({
        'client_id': clientId,
        'total_points': points,
        'available_points': points,
      });
    } else {
      await _client
          .from('customer_loyalty')
          .update({'total_points': newTotal, 'available_points': newAvailable}).eq('client_id', clientId);
    }

    await _client.from('loyalty_transactions').insert({
      'client_id': clientId,
      'type': 'admin_grant',
      'points': points,
      'description': reason,
      'balance_after': newAvailable,
    });
  }

  /// Resgata uma das recompensas de [rewardTiers] via Edge Function
  /// `redeemLoyaltyPoints`. Retorna o valor de desconto (em reais) gerado.
  Future<num> redeem(int points) async {
    final response = await _client.functions.invoke('redeemLoyaltyPoints', body: {
      'points': points,
    });
    return (response.data as Map<String, dynamic>)['discount_value'] as num;
  }
}
