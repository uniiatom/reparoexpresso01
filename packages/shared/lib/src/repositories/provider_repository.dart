import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/catalog.dart';
import '../models/provider.dart';

/// Acesso a `public.providers` para o prestador autenticado.
class ProviderRepository {
  ProviderRepository(this._client);

  final SupabaseClient _client;

  /// Perfil de prestador do usuário autenticado, se existir
  /// (`legacy/src/pages/ProviderApp.jsx` — `Provider.filter({ user_id })`).
  Future<Provider?> findMine() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return null;
    final data = await _client
        .from('providers')
        .select()
        .eq('user_id', uid)
        .maybeSingle();
    return data == null ? null : Provider.fromJson(data);
  }

  Future<void> setOnline(String providerId, bool isOnline) async {
    await _client.from('providers').update({'is_online': isOnline}).eq('id', providerId);
  }

  // ─── Lado cliente ────────────────────────────────────────────
  // Porta de `useNearbyProviders.js` — sem cálculo de distância por
  // enquanto (precisaria de localização do cliente já resolvida; o app
  // hoje pede endereço em texto, não coordenadas). Lista prestadores
  // aprovados/online que atendem a profissão, via `provider_professions`
  // (habilidades não são mais um array na própria linha — ver
  // /MIGRATION.md, seção 0.1). Prefira `CatalogRepository.findNearbyProviders`
  // (RPC com Haversine + cobertura de área) quando tiver a localização do
  // dispositivo.
  Future<List<Provider>> listAvailableForProfession(String professionId) async {
    final data = await _client
        .from('providers')
        .select('*, provider_professions!inner(profession_id)')
        .eq('is_approved', true)
        .eq('is_blocked', false)
        .eq('is_online', true)
        .eq('provider_professions.profession_id', professionId)
        .order('rating', ascending: false)
        .limit(20);
    return data.map(Provider.fromJson).toList();
  }

  // ─── Lado admin ──────────────────────────────────────────────
  // Porta de `legacy/src/components/admin/ProviderDocumentReview.jsx`.
  // RLS (`providers_update`) libera update para `is_admin()` em qualquer
  // linha — update direto, sem Edge Function.

  /// Pendente = ainda não aprovado e sem motivo de reprovação registrado
  /// (não existe coluna `is_rejected` no schema real — ver `Provider.isRejected`).
  Future<List<Provider>> listPendingApproval() async {
    final data = await _client
        .from('providers')
        .select()
        .eq('is_approved', false)
        .isFilter('rejection_reason', null)
        .order('created_at');
    return data.map(Provider.fromJson).toList();
  }

  Future<void> approve(String providerId) async {
    await _client.from('providers').update({
      'is_approved': true,
      'rejection_reason': null,
    }).eq('id', providerId);
  }

  Future<void> reject(String providerId, {String? reason}) async {
    await _client.from('providers').update({
      'is_approved': false,
      'rejection_reason': reason ?? 'Reprovado pelo admin',
    }).eq('id', providerId);
  }

  /// Desfaz aprovação/reprovação — porta de `UndoProviderAction.jsx`.
  Future<void> undoApprovalDecision(String providerId) async {
    await _client.from('providers').update({
      'is_approved': false,
      'rejection_reason': null,
    }).eq('id', providerId);
  }

  /// Sem coluna pra motivo/timestamp de bloqueio no schema real — só o
  /// booleano `is_blocked` existe.
  Future<void> setBlocked(String providerId, bool isBlocked) async {
    await _client.from('providers').update({'is_blocked': isBlocked}).eq('id', providerId);
  }

  /// Revisão individual de documento — porta de `ProviderDocumentReview.jsx`.
  /// [document] é `'id_holding_document'` (documento de identificação) ou
  /// `'address_proof'` (comprovante de endereço) — os dois únicos slots de
  /// documento com status/motivo de rejeição no schema real.
  Future<void> setDocumentStatus({
    required String providerId,
    required String document,
    required String status, // 'aprovado' | 'rejeitado'
    String? rejectionReason,
  }) async {
    await _client.from('providers').update({
      '${document}_status': status,
      '${document}_rejection_reason': rejectionReason,
    }).eq('id', providerId);
  }

  Future<List<Provider>> searchAll({String? query}) async {
    var builder = _client.from('providers').select();
    if (query != null && query.trim().isNotEmpty) {
      final q = query.trim();
      builder = builder.or('name.ilike.%$q%,phone.ilike.%$q%,email.ilike.%$q%');
    }
    final data = await builder.order('created_at', ascending: false).limit(100);
    return data.map(Provider.fromJson).toList();
  }

  // ─── Profissões atendidas ────────────────────────────────────
  // `provider_professions` substitui o antigo array `specialties` — ver
  // /MIGRATION.md, seção 0.1.

  Future<List<String>> listMyProfessionIds(String providerId) async {
    final data = await _client
        .from('provider_professions')
        .select('profession_id')
        .eq('provider_id', providerId);
    return data.map((row) => row['profession_id'] as String).toList();
  }

  Future<List<Profession>> listMyProfessions(String providerId) async {
    final data = await _client
        .from('provider_professions')
        .select('professions(*)')
        .eq('provider_id', providerId);
    return data.map((row) => Profession.fromJson(row['professions'] as Map<String, dynamic>)).toList();
  }

  /// Substitui as profissões atendidas pelo prestador pela lista informada.
  Future<void> setProfessions(String providerId, List<String> professionIds) async {
    await _client.from('provider_professions').delete().eq('provider_id', providerId);
    if (professionIds.isEmpty) return;
    await _client.from('provider_professions').insert([
      for (final professionId in professionIds) {'provider_id': providerId, 'profession_id': professionId},
    ]);
  }
}
