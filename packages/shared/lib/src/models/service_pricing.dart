/// Linha de `public.service_pricing` — porta de `ServicePricing.jsx`.
class ServicePricing {
  const ServicePricing({
    required this.id,
    required this.serviceType,
    required this.createdAt,
    this.priceMin,
    this.priceMax,
    this.zone,
    this.city,
    this.note,
  });

  final String id;
  final String serviceType;
  final DateTime createdAt;
  final num? priceMin;
  final num? priceMax;
  final String? zone;
  final String? city;
  final String? note;

  factory ServicePricing.fromJson(Map<String, dynamic> json) {
    return ServicePricing(
      id: json['id'] as String,
      serviceType: json['service_type'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      priceMin: json['price_min'] as num?,
      priceMax: json['price_max'] as num?,
      zone: json['zone'] as String?,
      city: json['city'] as String?,
      note: json['note'] as String?,
    );
  }
}
