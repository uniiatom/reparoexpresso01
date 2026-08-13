/// Linha de `public.client_notifications` — porta de `NotificationCenter.jsx`.
class ClientNotification {
  const ClientNotification({
    required this.id,
    required this.createdAt,
    this.type,
    this.title,
    this.message,
    this.isRead = false,
    this.actionUrl,
  });

  final String id;
  final DateTime createdAt;
  final String? type;
  final String? title;
  final String? message;
  final bool isRead;
  final String? actionUrl;

  factory ClientNotification.fromJson(Map<String, dynamic> json) {
    return ClientNotification(
      id: json['id'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      type: json['type'] as String?,
      title: json['title'] as String?,
      message: json['message'] as String?,
      isRead: json['is_read'] as bool? ?? false,
      actionUrl: json['action_url'] as String?,
    );
  }
}
