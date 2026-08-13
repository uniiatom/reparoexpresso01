/// Linha de `public.preventive_service_reminders` — porta de
/// `PreventiveServiceAlarmForm/List.jsx`.
class PreventiveServiceReminder {
  const PreventiveServiceReminder({
    required this.id,
    required this.serviceType,
    required this.isActive,
    required this.createdAt,
    this.nextReminderDate,
    this.reminderIntervalLabel,
    this.notes,
  });

  final String id;
  final String serviceType;
  final bool isActive;
  final DateTime createdAt;
  final DateTime? nextReminderDate;
  final String? reminderIntervalLabel;
  final String? notes;

  factory PreventiveServiceReminder.fromJson(Map<String, dynamic> json) {
    return PreventiveServiceReminder(
      id: json['id'] as String,
      serviceType: json['service_type'] as String,
      isActive: json['is_active'] as bool? ?? true,
      createdAt: DateTime.parse(json['created_at'] as String),
      nextReminderDate:
          json['next_reminder_date'] == null ? null : DateTime.parse(json['next_reminder_date'] as String),
      reminderIntervalLabel: json['reminder_interval_label'] as String?,
      notes: json['notes'] as String?,
    );
  }
}
