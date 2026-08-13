import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/client.dart';

/// Porta simplificada de `legacy/src/pages/ClientRegister.jsx`
/// (`base44.entities.Client.create`) — agora direto contra `public.clients`.
class ClientRepository {
  ClientRepository(this._client);

  final SupabaseClient _client;

  Future<Client?> findMine() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return null;
    final data = await _client
        .from('clients')
        .select()
        .eq('user_id', uid)
        .maybeSingle();
    return data == null ? null : Client.fromJson(data);
  }

  Future<Client> createMine({
    required String name,
    required String phone,
    String? cpf,
    DateTime? birthDate,
    String? photoUrl,
    bool termsAccepted = false,
  }) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) throw StateError('Não autenticado');

    final data = await _client
        .from('clients')
        .insert({
          'user_id': uid,
          'name': name,
          'phone': phone,
          'cpf': ?cpf,
          'birth_date': ?birthDate?.toIso8601String().split('T').first,
          'photo_url': ?photoUrl,
          'terms_accepted_at': termsAccepted ? DateTime.now().toIso8601String() : null,
        })
        .select()
        .single();
    return Client.fromJson(data);
  }

  Future<Client> updateMine({
    required String clientId,
    String? name,
    String? phone,
    String? photoUrl,
    String? referralCode,
  }) async {
    final data = await _client
        .from('clients')
        .update({
          'name': ?name,
          'phone': ?phone,
          'photo_url': ?photoUrl,
          'referral_code': ?referralCode,
        })
        .eq('id', clientId)
        .select()
        .single();
    return Client.fromJson(data);
  }

  // ─── Lado admin ──────────────────────────────────────────────
  // Porta de `ClientHistoryPanel.jsx`/`ClientConsultaAdmin.jsx`/
  // `ClientBlacklist.jsx`. RLS (`clients_access`) libera `is_staff()` pra
  // ver/editar qualquer cliente.

  Future<List<Client>> searchAll({String? query}) async {
    var builder = _client.from('clients').select();
    if (query != null && query.trim().isNotEmpty) {
      final q = query.trim();
      // `cpf` é bigint no banco — ilike (operador de texto) não se aplica,
      // por isso a busca cobre só nome/telefone.
      builder = builder.or('name.ilike.%$q%,phone.ilike.%$q%');
    }
    final data = await builder.order('created_at', ascending: false).limit(100);
    return data.map(Client.fromJson).toList();
  }

  Future<void> setBlacklisted(String clientId, bool isBlacklisted, {String? reason}) async {
    await _client.from('clients').update({
      'is_blacklisted': isBlacklisted,
      'blacklist_reason': ?reason,
      'blacklisted_at': isBlacklisted ? DateTime.now().toIso8601String() : null,
    }).eq('id', clientId);
  }
}
