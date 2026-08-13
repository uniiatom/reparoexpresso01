import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/wallet.dart';

/// Porta de `legacy/src/pages/Wallet.jsx`. `ownerId` é o `auth.uid()` do
/// dono (cliente ou prestador — RLS de `wallets`/`wallet_transactions`
/// libera por `owner_id = auth.uid()` ou staff).
class WalletRepository {
  WalletRepository(this._client);

  final SupabaseClient _client;

  Future<Wallet?> findMine() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return null;
    final data = await _client
        .from('wallets')
        .select()
        .eq('owner_id', uid)
        .maybeSingle();
    return data == null ? null : Wallet.fromJson(data);
  }

  Future<List<WalletTransaction>> listMyTransactions() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return const [];
    final data = await _client
        .from('wallet_transactions')
        .select()
        .eq('owner_id', uid)
        .order('created_at', ascending: false);
    return data.map(WalletTransaction.fromJson).toList();
  }

  Future<void> requestWithdrawal({
    required String walletId,
    required num amount,
    required String pixKey,
    required String pixKeyType,
  }) async {
    await _client.functions.invoke('processWalletWithdrawal', body: {
      'walletId': walletId,
      'amount': amount,
      'pixKey': pixKey,
      'pixKeyType': pixKeyType,
    });
  }

  // ─── Lado admin ──────────────────────────────────────────────
  // Porta de `ReembolsosRepasses.jsx`. RLS libera `is_staff()` pra
  // qualquer `owner_id`. Sem Edge Function dedicada — cria/atualiza a
  // wallet direto, mesmo padrão do `AdditionalPointsAdmin` pra fidelidade.

  Future<Wallet?> findWalletForOwner(String ownerId) async {
    final data = await _client.from('wallets').select().eq('owner_id', ownerId).maybeSingle();
    return data == null ? null : Wallet.fromJson(data);
  }

  Future<void> issueRefund({
    required String ownerId,
    required String ownerType,
    String? ownerName,
    required num amount,
    required String reason,
  }) async {
    var wallet = await findWalletForOwner(ownerId);
    if (wallet == null) {
      final inserted = await _client
          .from('wallets')
          .insert({'owner_id': ownerId, 'owner_type': ownerType, 'owner_name': ownerName, 'balance': 0})
          .select()
          .single();
      wallet = Wallet.fromJson(inserted);
    }

    final newBalance = wallet.balance + amount;
    await _client.from('wallets').update({'balance': newBalance}).eq('id', wallet.id);
    await _client.from('wallet_transactions').insert({
      'wallet_id': wallet.id,
      'owner_id': ownerId,
      'owner_type': ownerType,
      'type': 'reembolso',
      'amount': amount,
      'balance_after': newBalance,
      'description': reason,
      'status': 'concluido',
    });
  }
}
