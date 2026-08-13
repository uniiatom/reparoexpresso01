/// Grupo do serviço — espelha o `CHECK (service_group IN ('casa', 'veiculo'))`
/// da tabela `offered_services`.
enum ServiceGroup {
  casa,
  veiculo;

  static ServiceGroup fromDbValue(String value) => ServiceGroup.values.firstWhere(
        (g) => g.name == value,
        orElse: () => throw ArgumentError('Grupo de serviço desconhecido: $value'),
      );
}

/// Linha da tabela `public.offered_services` — o catálogo de serviços já é
/// 100% dirigido pelo banco (não é mais hardcoded como no antigo
/// `legacy/src/lib/serviceTypes.js`; aquele arquivo hoje só mapeia ícones).
/// Fonte: `supabase/migrations/20260527120000_offered_services.sql`.
class OfferedService {
  const OfferedService({
    required this.id,
    required this.slug,
    required this.name,
    required this.serviceGroup,
    required this.createdAt,
    required this.updatedAt,
    this.description,
    this.averagePrice,
    this.estimatedDurationMinutes,
    this.imageUrl,
    this.iconKey,
    this.extraFieldDefinitions = const [],
    this.fieldValues = const {},
    this.isActive = true,
    this.sortOrder = 0,
  });

  final String id;
  final String slug;
  final String name;
  final ServiceGroup serviceGroup;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? description;
  final num? averagePrice;
  final int? estimatedDurationMinutes;
  final String? imageUrl;
  final String? iconKey;
  final List<dynamic> extraFieldDefinitions;
  final Map<String, dynamic> fieldValues;
  final bool isActive;
  final int sortOrder;

  factory OfferedService.fromJson(Map<String, dynamic> json) {
    return OfferedService(
      id: json['id'] as String,
      slug: json['slug'] as String,
      name: json['name'] as String,
      serviceGroup: ServiceGroup.fromDbValue(json['service_group'] as String),
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      description: json['description'] as String?,
      averagePrice: json['average_price'] as num?,
      estimatedDurationMinutes: json['estimated_duration_minutes'] as int?,
      imageUrl: json['image_url'] as String?,
      iconKey: json['icon_key'] as String?,
      extraFieldDefinitions: (json['extra_field_definitions'] as List?) ?? const [],
      fieldValues: (json['field_values'] as Map<String, dynamic>?) ?? const {},
      isActive: json['is_active'] as bool? ?? true,
      sortOrder: json['sort_order'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'slug': slug,
        'name': name,
        'service_group': serviceGroup.name,
        'created_at': createdAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
        'description': description,
        'average_price': averagePrice,
        'estimated_duration_minutes': estimatedDurationMinutes,
        'image_url': imageUrl,
        'icon_key': iconKey,
        'extra_field_definitions': extraFieldDefinitions,
        'field_values': fieldValues,
        'is_active': isActive,
        'sort_order': sortOrder,
      };
}

/// Linha de `public.offered_service_field_templates` — campos extras
/// configuráveis pelo admin por serviço (ex.: garantia, inclui material).
class OfferedServiceFieldTemplate {
  const OfferedServiceFieldTemplate({
    required this.id,
    required this.fieldKey,
    required this.fieldLabel,
    required this.fieldType,
    this.placeholder,
    this.options = const [],
    this.isRequired = false,
    this.sortOrder = 0,
    this.isActive = true,
  });

  final String id;
  final String fieldKey;
  final String fieldLabel;
  final String fieldType; // text | number | textarea | boolean | select
  final String? placeholder;
  final List<dynamic> options;
  final bool isRequired;
  final int sortOrder;
  final bool isActive;

  factory OfferedServiceFieldTemplate.fromJson(Map<String, dynamic> json) {
    return OfferedServiceFieldTemplate(
      id: json['id'] as String,
      fieldKey: json['field_key'] as String,
      fieldLabel: json['field_label'] as String,
      fieldType: json['field_type'] as String,
      placeholder: json['placeholder'] as String?,
      options: (json['options'] as List?) ?? const [],
      isRequired: json['is_required'] as bool? ?? false,
      sortOrder: json['sort_order'] as int? ?? 0,
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}
