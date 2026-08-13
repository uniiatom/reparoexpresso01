import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/biweekly_closing.dart';
import '../models/invoice.dart';
import '../models/reserve_fund.dart';

/// Porta de `InvoicesAdmin.jsx` + `BiweeklyClosingAdmin.jsx` +
/// `AdminReserveFundDashboard.jsx` (lado admin — visão global) e
/// `ProviderReserveFund.jsx` (lado prestador — só o próprio fundo).
class FinanceRepository {
  FinanceRepository(this._client);

  final SupabaseClient _client;

  Future<List<Invoice>> listInvoices() async {
    final data = await _client.from('invoices').select().order('created_at', ascending: false);
    return data.map(Invoice.fromJson).toList();
  }

  Future<List<BiweeklyClosing>> listBiweeklyClosings() async {
    final data = await _client.from('biweekly_closings').select().order('created_at', ascending: false);
    return data.map(BiweeklyClosing.fromJson).toList();
  }

  Future<void> markClosingPaid(String id) async {
    await _client.from('biweekly_closings').update({'status': 'pago'}).eq('id', id);
  }

  Future<List<ReserveFund>> listAllReserveFunds() async {
    final data = await _client.from('reserve_funds').select().order('provider_name');
    return data.map(ReserveFund.fromJson).toList();
  }

  Future<ReserveFund?> findMyReserveFund() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return null;
    final provider = await _client.from('providers').select('id').eq('user_id', uid).maybeSingle();
    if (provider == null) return null;
    final data = await _client
        .from('reserve_funds')
        .select()
        .eq('provider_id', provider['id'])
        .maybeSingle();
    return data == null ? null : ReserveFund.fromJson(data);
  }
}
