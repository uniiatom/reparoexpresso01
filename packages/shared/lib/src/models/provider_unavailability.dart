/// Linha de `public.provider_unavailability` — bloqueio pontual de agenda
/// (férias, compromisso etc.), complementar a `provider_availability`.
class ProviderUnavailability {
  const ProviderUnavailability({
    required this.id,
    required this.startDate,
    required this.endDate,
    this.startTime,
    this.endTime,
    this.reason,
  });

  final String id;
  final DateTime startDate;
  final DateTime endDate;
  final String? startTime;
  final String? endTime;
  final String? reason;

  factory ProviderUnavailability.fromJson(Map<String, dynamic> json) {
    return ProviderUnavailability(
      id: json['id'] as String,
      startDate: DateTime.parse(json['start_date'] as String),
      endDate: DateTime.parse(json['end_date'] as String),
      startTime: json['start_time'] as String?,
      endTime: json['end_time'] as String?,
      reason: json['reason'] as String?,
    );
  }
}
