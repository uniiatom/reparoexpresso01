/// Linha de `public.coupons` — porta de `CouponsAdmin.jsx` (PRD §7.5).
/// `professionIds` restringe o cupom a profissões do catálogo novo (vazio =
/// vale pra qualquer serviço) — substitui `service_types` (slugs do
/// catálogo antigo, coluna mantida no banco mas não usada mais aqui, ver
/// MIGRATION.md seção 0.2/0.3).
class Coupon {
  const Coupon({
    required this.id,
    required this.code,
    required this.discountType,
    required this.discountValue,
    required this.currentUses,
    required this.isActive,
    required this.createdAt,
    this.description,
    this.maxUses,
    this.validFrom,
    this.validUntil,
    this.professionIds = const [],
  });

  final String id;
  final String code;
  final String discountType; // percentage | fixed
  final num discountValue;
  final int currentUses;
  final bool isActive;
  final DateTime createdAt;
  final String? description;
  final int? maxUses;
  final DateTime? validFrom;
  final DateTime? validUntil;
  final List<String> professionIds;

  factory Coupon.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(Object? v) => v == null ? null : DateTime.parse(v as String);
    return Coupon(
      id: json['id'] as String,
      code: json['code'] as String,
      discountType: json['discount_type'] as String,
      discountValue: json['discount_value'] as num,
      currentUses: json['current_uses'] as int? ?? 0,
      isActive: json['is_active'] as bool? ?? true,
      createdAt: DateTime.parse(json['created_at'] as String),
      description: json['description'] as String?,
      maxUses: json['max_uses'] as int?,
      validFrom: parseDate(json['valid_from']),
      validUntil: parseDate(json['valid_until']),
      professionIds: (json['profession_ids'] as List?)?.map((e) => e.toString()).toList() ?? const [],
    );
  }
}
