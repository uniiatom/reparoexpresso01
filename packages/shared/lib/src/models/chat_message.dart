/// Linha de `public.chat_messages` — chat de uma OS entre cliente e
/// prestador (`legacy/src/components/ServiceChat.jsx`).
class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.requestId,
    required this.text,
    required this.createdAt,
    this.senderRole,
    this.senderName,
  });

  final String id;
  final String requestId;
  final String text;
  final DateTime createdAt;
  final String? senderRole;
  final String? senderName;

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] as String,
      requestId: json['request_id'] as String,
      text: json['text'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      senderRole: json['sender_role'] as String?,
      senderName: json['sender_name'] as String?,
    );
  }
}
