/// Linha de `public.service_price_history` — histórico de eventos de
/// preço de uma OS (orçamento extra, ajuste manual etc.).
class ServicePriceHistoryEntry {
  const ServicePriceHistoryEntry({
    required this.id,
    required this.timestamp,
    this.serviceId,
    this.eventType,
    this.actorType,
    this.actorName,
    this.previousPrice,
    this.newPrice,
    this.reason,
  });

  final String id;
  final DateTime timestamp;
  final String? serviceId;
  final String? eventType;
  final String? actorType;
  final String? actorName;
  final num? previousPrice;
  final num? newPrice;
  final String? reason;

  factory ServicePriceHistoryEntry.fromJson(Map<String, dynamic> json) {
    return ServicePriceHistoryEntry(
      id: json['id'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      serviceId: json['service_id'] as String?,
      eventType: json['event_type'] as String?,
      actorType: json['actor_type'] as String?,
      actorName: json['actor_name'] as String?,
      previousPrice: json['previous_price'] as num?,
      newPrice: json['new_price'] as num?,
      reason: json['reason'] as String?,
    );
  }
}
