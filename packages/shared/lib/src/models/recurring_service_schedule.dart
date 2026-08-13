/// Linha de `public.recurring_service_schedules` — porta de
/// `RecurringServiceForm/List/Calendar.jsx`. A criação da OS de cada
/// ocorrência é feita pelo cron (`processRecurringServices`, já ativo no
/// Supabase) — aqui só criamos/listamos/cancelamos a recorrência.
class RecurringServiceSchedule {
  const RecurringServiceSchedule({
    required this.id,
    required this.isActive,
    required this.createdAt,
    this.professionId,
    this.professionName,
    this.subServiceId,
    this.subServiceName,
    this.recurrencePattern,
    this.nextServiceDate,
    this.address,
    this.notes,
  });

  final String id;
  final bool isActive;
  final DateTime createdAt;
  final String? professionId;
  final String? professionName;
  final String? subServiceId;
  final String? subServiceName;
  final String? recurrencePattern; // semanal | quinzenal | mensal
  final DateTime? nextServiceDate;
  final String? address;
  final String? notes;

  /// Rótulo pra UI: sub-serviço se houver, senão a profissão.
  String get serviceLabel => subServiceName ?? professionName ?? 'Serviço';

  factory RecurringServiceSchedule.fromJson(Map<String, dynamic> json) {
    return RecurringServiceSchedule(
      id: json['id'] as String,
      isActive: json['is_active'] as bool? ?? true,
      createdAt: DateTime.parse(json['created_at'] as String),
      professionId: json['profession_id'] as String?,
      professionName: (json['professions'] as Map<String, dynamic>?)?['name'] as String?,
      subServiceId: json['sub_service_id'] as String?,
      subServiceName: (json['sub_services'] as Map<String, dynamic>?)?['name'] as String?,
      recurrencePattern: json['recurrence_pattern'] as String?,
      nextServiceDate:
          json['next_service_date'] == null ? null : DateTime.parse(json['next_service_date'] as String),
      address: json['address'] as String?,
      notes: json['notes'] as String?,
    );
  }
}
