/// Linha de `public.provider_availability` — porta de `ProviderSchedule.jsx`.
class ProviderAvailability {
  const ProviderAvailability({
    required this.id,
    required this.dayOfWeek,
    required this.startTime,
    required this.endTime,
    this.isAvailable = true,
    this.maxSlotsPerDay = 5,
  });

  final String id;
  final int dayOfWeek; // 0 = domingo .. 6 = sábado
  final String startTime; // 'HH:mm:ss'
  final String endTime;
  final bool isAvailable;
  final int maxSlotsPerDay;

  static const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  factory ProviderAvailability.fromJson(Map<String, dynamic> json) {
    return ProviderAvailability(
      id: json['id'] as String,
      dayOfWeek: json['day_of_week'] as int,
      startTime: json['start_time'] as String,
      endTime: json['end_time'] as String,
      isAvailable: json['is_available'] as bool? ?? true,
      maxSlotsPerDay: json['max_slots_per_day'] as int? ?? 5,
    );
  }
}
