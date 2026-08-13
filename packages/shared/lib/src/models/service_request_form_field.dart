/// Linha de `public.service_request_form_fields` — pergunta dinâmica exibida
/// na solicitação de serviço. `subServiceId == null` significa campo global
/// (aparece pra qualquer solicitação, não só de um sub-serviço específico).
/// Tipos conhecidos hoje no schema real: `short_text`, `long_text`,
/// `location` (usa GPS do dispositivo, sem mapa interativo). Tipos futuros
/// (`select`/`number`/`checkbox`) caem no fallback de texto livre — ver
/// `ServiceRequestFormRepository`.
class ServiceRequestFormField {
  const ServiceRequestFormField({
    required this.id,
    required this.label,
    required this.fieldType,
    this.isRequired = false,
    this.isActive = true,
    this.sortOrder = 0,
    this.helpText,
    this.options = const [],
    this.subServiceId,
  });

  final String id;
  final String label;
  final String fieldType;
  final bool isRequired;
  final bool isActive;
  final int sortOrder;
  final String? helpText;
  final List<String> options;
  final String? subServiceId;

  factory ServiceRequestFormField.fromJson(Map<String, dynamic> json) {
    return ServiceRequestFormField(
      id: json['id'] as String,
      label: json['label'] as String,
      fieldType: json['field_type'] as String,
      isRequired: json['is_required'] as bool? ?? false,
      isActive: json['is_active'] as bool? ?? true,
      sortOrder: json['sort_order'] as int? ?? 0,
      helpText: json['help_text'] as String?,
      options: (json['options'] as List?)?.map((e) => e.toString()).toList() ?? const [],
      subServiceId: json['sub_service_id'] as String?,
    );
  }
}
