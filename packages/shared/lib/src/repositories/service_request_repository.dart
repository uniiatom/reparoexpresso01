import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/service_request.dart';
import '../models/service_request_status.dart';

/// Porta de `legacy/src/lib/repositories/serviceRequestsRepository.js`.
/// Todo `.select()` abaixo inclui o embed `professions(name)`/
/// `sub_services(name)` pra popular `ServiceRequest.serviceLabel` — exceto
/// os métodos `watch*` (Realtime): o `SupabaseStreamBuilder` não suporta
/// customizar colunas/embeds, então OS vindas de stream ficam sem nome de
/// serviço até a tela buscar de novo via `.select()`. Ver /MIGRATION.md
/// (schema novo, `profession_id`/`sub_service_id` substituindo `service_type`).
class ServiceRequestRepository {
  ServiceRequestRepository(this._client);

  final SupabaseClient _client;

  static const _withCatalogEmbed = '*, professions(name), sub_services(name)';

  static const activeStatuses = [
    ServiceRequestStatus.aguardando,
    ServiceRequestStatus.aceito,
    ServiceRequestStatus.aCaminho,
    ServiceRequestStatus.emAndamento,
    ServiceRequestStatus.emEspera,
    ServiceRequestStatus.agendado,
  ];

  /// Resolve o `clients.id` do usuário autenticado — `service_requests.client_id`
  /// é FK pra `clients.id`, não mais o `auth.uid()` direto.
  Future<String> _myClientId() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) throw StateError('Não autenticado');
    final row = await _client.from('clients').select('id').eq('user_id', uid).single();
    return row['id'] as String;
  }

  /// OS ativas do cliente autenticado (via RLS).
  Future<List<ServiceRequest>> listMyActive() async {
    final data = await _client
        .from('service_requests')
        .select(_withCatalogEmbed)
        .inFilter('status', activeStatuses.map((s) => s.dbValue).toList())
        .order('created_at', ascending: false);
    return data.map(ServiceRequest.fromJson).toList();
  }

  /// Histórico completo do cliente autenticado.
  Future<List<ServiceRequest>> listMine() async {
    final data = await _client
        .from('service_requests')
        .select(_withCatalogEmbed)
        .order('created_at', ascending: false);
    return data.map(ServiceRequest.fromJson).toList();
  }

  /// Cria a OS (porta simplificada de `SolicitarServico.jsx`: sem busca
  /// prévia de prestadores — a fila de chamados do app prestador cuida
  /// disso). Pagamento/cupom são um passo separado, ver `PaymentRepository`.
  Future<ServiceRequest> createDraft({
    required String professionId,
    String? subServiceId,
    String? notes,
    String? description,
    String? address,
    String? neighborhood,
    String? city,
    String? state,
    double? latitude,
    double? longitude,
    String urgency = 'agora',
    String modality = 'imediato',
    DateTime? scheduledDate,
    String? scheduledTime,
    List<String> problemPhotos = const [],
    // Reboque: destino do veículo.
    String? deliveryAddress,
    String? deliveryNeighborhood,
    String? deliveryCity,
    String? deliveryState,
    num? towDistanceKm,
  }) async {
    final clientId = await _myClientId();

    final data = await _client
        .from('service_requests')
        .insert({
          'client_id': clientId,
          'profession_id': professionId,
          'sub_service_id': ?subServiceId,
          'status': ServiceRequestStatus.aguardando.dbValue,
          'notes': ?notes,
          'description': ?description,
          'address': ?address,
          'neighborhood': ?neighborhood,
          'city': ?city,
          'state': ?state,
          'latitude': ?latitude,
          'longitude': ?longitude,
          'urgency': urgency,
          'modality': modality,
          'scheduled_date': ?scheduledDate?.toIso8601String().split('T').first,
          'scheduled_time': ?scheduledTime,
          'problem_photos': problemPhotos,
          'delivery_address': ?deliveryAddress,
          'delivery_neighborhood': ?deliveryNeighborhood,
          'delivery_city': ?deliveryCity,
          'delivery_state': ?deliveryState,
          'tow_distance_km': ?towDistanceKm,
        })
        .select(_withCatalogEmbed)
        .single();
    return ServiceRequest.fromJson(data);
  }

  /// Stream Realtime das OS do cliente autenticado — sem filtro explícito
  /// de `client_id` porque a RLS (`service_requests_client`) já escopa
  /// pro dono; evita precisar resolver `clients.id` de forma assíncrona
  /// aqui (isto é um getter síncrono que retorna `Stream`).
  Stream<List<ServiceRequest>> watchMine() {
    return _client
        .from('service_requests')
        .stream(primaryKey: ['id'])
        .order('created_at', ascending: false)
        .map((rows) => rows.map(ServiceRequest.fromJson).toList());
  }

  // ─── Lado admin ──────────────────────────────────────────────
  // RLS (`service_requests_select`) libera `is_staff()` para ver todas as
  // linhas — mesma query de `listMine()`, mas sem o filtro implícito de
  // `client_id` (a RLS já faz o trabalho).

  Future<List<ServiceRequest>> listAllForStaff() => listMine();

  /// Histórico de um cliente específico — porta de `ClientHistoryPanel.jsx`.
  /// [clientId] é `clients.id` (não `user_id`/`auth.uid()`).
  Future<List<ServiceRequest>> listForClient(String clientId) async {
    final data = await _client
        .from('service_requests')
        .select(_withCatalogEmbed)
        .eq('client_id', clientId)
        .order('created_at', ascending: false);
    return data.map(ServiceRequest.fromJson).toList();
  }

  Stream<List<ServiceRequest>> watchAllForStaff() {
    return _client
        .from('service_requests')
        .stream(primaryKey: ['id'])
        .order('created_at', ascending: false)
        .map((rows) => rows.map(ServiceRequest.fromJson).toList());
  }

  // ─── Lado prestador ──────────────────────────────────────────
  // RLS (`service_requests_select`) libera para qualquer `provider`
  // autenticado: linhas com status `aguardando` (fila) + linhas já
  // atribuídas a ele. Ver `supabase/migrations/20260525120000_full_base44_migration.sql`.

  /// Fila de chamados disponíveis (ainda sem prestador atribuído).
  Stream<List<ServiceRequest>> watchAvailableQueue() {
    return _client
        .from('service_requests')
        .stream(primaryKey: ['id'])
        .eq('status', ServiceRequestStatus.aguardando.dbValue)
        .order('created_at')
        .map((rows) => rows.map(ServiceRequest.fromJson).toList());
  }

  /// OS já atribuídas ao prestador (aceitas, a caminho, em andamento…).
  Future<List<ServiceRequest>> listMyJobs(String providerId) async {
    final data = await _client
        .from('service_requests')
        .select(_withCatalogEmbed)
        .eq('provider_id', providerId)
        .order('created_at', ascending: false);
    return data.map(ServiceRequest.fromJson).toList();
  }

  /// Aceita um chamado — via Edge Function `assignServiceToProvider`
  /// (roda com service role; um `UPDATE` direto do cliente não passaria
  /// pela RLS de `service_requests_update`, que só libera update em OS já
  /// atribuídas a ele). Porta de
  /// `legacy/src/components/AvailableRequestsMap.jsx#handleAcceptRequest`.
  Future<void> acceptJob({required String requestId, required String providerId}) async {
    await _client.functions.invoke(
      'assignServiceToProvider',
      body: {'request_id': requestId, 'provider_id': providerId},
    );
  }

  /// Avança o status de uma OS já atribuída (aceito → a_caminho →
  /// em_andamento → concluido). Diferente de `acceptJob`: aqui um `UPDATE`
  /// direto funciona, porque a RLS já libera update pro prestador dono do
  /// `provider_id` da linha. Porta simplificada de `ActiveJobCard.jsx`.
  Future<void> updateStatus(String requestId, ServiceRequestStatus status) async {
    await _client.from('service_requests').update({'status': status.dbValue}).eq('id', requestId);
  }

  /// Avaliação do cliente sobre o serviço concluído — porta de
  /// `RatingModal.jsx`. `service_requests_update` libera pro `client_id`
  /// dono da OS.
  Future<void> rate(String requestId, {required num rating, String? comment}) async {
    await _client.from('service_requests').update({
      'rating_client': rating,
      'rating_comment': ?comment,
    }).eq('id', requestId);
  }

  /// Recusa de chamado pelo prestador — via Edge Function
  /// `processServiceRefusal`, que exige motivo(s) e fotos de evidência.
  /// Porta de `DeclineReasonModal.jsx`.
  Future<void> declineJob({
    required String requestId,
    required String providerId,
    required List<String> reasons,
    required String description,
    required List<String> photos,
  }) async {
    await _client.functions.invoke('processServiceRefusal', body: {
      'service_request_id': requestId,
      'provider_id': providerId,
      'reasons': reasons,
      'description': description,
      'photos': photos,
    });
  }

  // ─── Orçamento extra ─────────────────────────────────────────
  // Porta de `PartsEstimator.jsx` (envio) e `EstimateApprovalPanel.jsx`
  // (aprovação/rejeição). Corrigido na Fase 6: as 3 functions esperam
  // `service_requests.extra_charges` — coluna adicionada em
  // `20260601140000_add_extra_charges_column.sql`.

  Future<void> sendExtraChargesRequest({
    required String serviceId,
    required String providerId,
    required String providerName,
    required num materialTotal,
    num? laborTotal,
    required num extraChargesTotal,
    required num newTotal,
    List<Map<String, dynamic>> items = const [],
    List<String> photos = const [],
  }) async {
    await _client.functions.invoke('sendExtraChargesRequest', body: {
      'service_id': serviceId,
      'provider_id': providerId,
      'provider_name': providerName,
      'material_total': materialTotal,
      'labor_total': laborTotal,
      'extra_charges_total': extraChargesTotal,
      'new_total': newTotal,
      'items': items,
      'photos': photos,
    });
  }

  Future<void> approveExtraCharges({
    required String serviceId,
    required String providerId,
    String? clientName,
    required num extraChargesTotal,
    required num newTotal,
  }) async {
    await _client.functions.invoke('approveExtraCharges', body: {
      'service_id': serviceId,
      'provider_id': providerId,
      'client_name': clientName,
      'extra_charges_total': extraChargesTotal,
      'new_total': newTotal,
    });
  }

  Future<void> rejectExtraCharges({
    required String serviceId,
    required String providerId,
    String? clientName,
    required String rejectionNotes,
  }) async {
    await _client.functions.invoke('rejectExtraCharges', body: {
      'service_id': serviceId,
      'provider_id': providerId,
      'client_name': clientName,
      'rejection_notes': rejectionNotes,
    });
  }
}
