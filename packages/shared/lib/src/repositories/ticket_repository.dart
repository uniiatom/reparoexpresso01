import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/ticket.dart';

/// Porta de `legacy/src/components/admin/TicketsAdmin.jsx` +
/// `ClientTicketForm.jsx`/`ProviderTicketForm.jsx`. RLS corrigida na Fase 6
/// estendida (`20260601150000_tickets_owner_access.sql`) pra liberar
/// cliente/prestador dono do ticket, além de staff.
class TicketRepository {
  TicketRepository(this._client);

  final SupabaseClient _client;

  /// Abre um ticket de suporte — porta de `ClientTicketForm.jsx` (quando
  /// `providerId` é nulo) / `ProviderTicketForm.jsx` (quando é informado).
  Future<void> createMine({
    required String type,
    required String subject,
    required String message,
    String? providerId,
    String? serviceRequestId,
  }) async {
    final user = _client.auth.currentUser;
    if (user == null) throw StateError('Não autenticado');
    await _client.from('tickets').insert({
      if (providerId == null) 'client_id': user.id,
      'client_email': ?user.email,
      'provider_id': ?providerId,
      'type': type,
      'subject': subject,
      'message': message,
      'service_request_id': ?serviceRequestId,
    });
  }

  Stream<List<Ticket>> watchMine() {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return const Stream.empty();
    return _client
        .from('tickets')
        .stream(primaryKey: ['id'])
        .eq('client_id', uid)
        .order('created_at', ascending: false)
        .map((rows) => rows.map(Ticket.fromJson).toList());
  }

  Stream<List<Ticket>> watchMineAsProvider(String providerId) {
    return _client
        .from('tickets')
        .stream(primaryKey: ['id'])
        .eq('provider_id', providerId)
        .order('created_at', ascending: false)
        .map((rows) => rows.map(Ticket.fromJson).toList());
  }

  Stream<List<Ticket>> watchAll() {
    return _client
        .from('tickets')
        .stream(primaryKey: ['id'])
        .order('created_at', ascending: false)
        .map((rows) => rows.map(Ticket.fromJson).toList());
  }

  Stream<List<TicketMessage>> watchMessages(String ticketId) {
    return _client
        .from('ticket_messages')
        .stream(primaryKey: ['id'])
        .eq('ticket_id', ticketId)
        .order('created_at')
        .map((rows) => rows.map(TicketMessage.fromJson).toList());
  }

  Future<void> reply({
    required String ticketId,
    required String text,
    String senderName = 'Admin',
  }) async {
    await _client.from('ticket_messages').insert({
      'ticket_id': ticketId,
      'text': text,
      'sender_role': 'attendant',
      'sender_name': senderName,
    });
    await _client.from('tickets').update({'status': 'em_atendimento'}).eq('id', ticketId);
  }

  Future<void> setStatus(String ticketId, String status) async {
    await _client.from('tickets').update({'status': status}).eq('id', ticketId);
  }
}
