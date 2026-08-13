/// Linha de `public.service_parts` — catálogo de peças pro orçamento
/// extra do prestador (`PartsEstimator.jsx`). Leitura pra qualquer
/// autenticado, escrita só admin.
class ServicePart {
  const ServicePart({
    required this.id,
    required this.name,
    this.serviceType,
    this.description,
    this.unitPrice,
    this.unit,
    this.category,
    this.isActive = true,
  });

  final String id;
  final String name;
  final String? serviceType;
  final String? description;
  final num? unitPrice;
  final String? unit;
  final String? category;
  final bool isActive;

  factory ServicePart.fromJson(Map<String, dynamic> json) {
    return ServicePart(
      id: json['id'] as String,
      name: json['name'] as String,
      serviceType: json['service_type'] as String?,
      description: json['description'] as String?,
      unitPrice: json['unit_price'] as num?,
      unit: json['unit'] as String?,
      category: json['category'] as String?,
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}
