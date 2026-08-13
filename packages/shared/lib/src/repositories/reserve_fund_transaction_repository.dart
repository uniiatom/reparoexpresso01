import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/reserve_fund_transaction.dart';

/// RLS de `reserve_fund_transactions` é staff-only (`is_staff()`).
class ReserveFundTransactionRepository {
  ReserveFundTransactionRepository(this._client);

  final SupabaseClient _client;

  Future<List<ReserveFundTransaction>> listFor(String reserveFundId) async {
    final data = await _client
        .from('reserve_fund_transactions')
        .select()
        .eq('reserve_fund_id', reserveFundId)
        .order('created_at', ascending: false);
    return data.map(ReserveFundTransaction.fromJson).toList();
  }
}
