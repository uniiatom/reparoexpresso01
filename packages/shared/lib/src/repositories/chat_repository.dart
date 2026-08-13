import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/chat_message.dart';

/// Chat em tempo real de uma OS — porta de `ServiceChat.jsx`. RLS
/// (`chat_messages_access`) libera pra staff, cliente dono da OS, e
/// prestador atribuído a ela.
class ChatRepository {
  ChatRepository(this._client);

  final SupabaseClient _client;

  Stream<List<ChatMessage>> watch(String requestId) {
    return _client
        .from('chat_messages')
        .stream(primaryKey: ['id'])
        .eq('request_id', requestId)
        .order('created_at')
        .map((rows) => rows.map(ChatMessage.fromJson).toList());
  }

  Future<void> send({
    required String requestId,
    required String text,
    required String senderRole,
    String? senderName,
  }) async {
    await _client.from('chat_messages').insert({
      'request_id': requestId,
      'text': text,
      'sender_role': senderRole,
      'sender_name': ?senderName,
    });
  }
}
