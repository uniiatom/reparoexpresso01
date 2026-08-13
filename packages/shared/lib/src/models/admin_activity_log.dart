/// Linha de `public.admin_activity_logs` — porta de `ActivityLog.jsx`.
class AdminActivityLog {
  const AdminActivityLog({
    required this.id,
    required this.action,
    required this.createdAt,
    this.actorName,
    this.entityType,
    this.entityLabel,
    this.details,
  });

  final String id;
  final String action;
  final DateTime createdAt;
  final String? actorName;
  final String? entityType;
  final String? entityLabel;
  final String? details;

  factory AdminActivityLog.fromJson(Map<String, dynamic> json) {
    return AdminActivityLog(
      id: json['id'] as String,
      action: json['action'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      actorName: json['actor_name'] as String?,
      entityType: json['entity_type'] as String?,
      entityLabel: json['entity_label'] as String?,
      details: json['details'] as String?,
    );
  }
}
