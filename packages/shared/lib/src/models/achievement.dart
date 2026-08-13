/// Linha de `public.achievements` — catálogo de conquistas desbloqueáveis
/// (chaves referenciadas em `provider_achievements.achievements_unlocked`).
/// Leitura pra qualquer autenticado, escrita só admin.
class Achievement {
  const Achievement({
    required this.id,
    required this.name,
    this.key,
    this.description,
    this.icon,
    this.category,
    this.requirementType,
    this.requirementValue,
    this.visibilityBonus,
  });

  final String id;
  final String name;
  final String? key;
  final String? description;
  final String? icon;
  final String? category;
  final String? requirementType;
  final num? requirementValue;
  final num? visibilityBonus;

  factory Achievement.fromJson(Map<String, dynamic> json) {
    return Achievement(
      id: json['id'] as String,
      name: json['name'] as String,
      key: json['key'] as String?,
      description: json['description'] as String?,
      icon: json['icon'] as String?,
      category: json['category'] as String?,
      requirementType: json['requirement_type'] as String?,
      requirementValue: json['requirement_value'] as num?,
      visibilityBonus: json['visibility_bonus'] as num?,
    );
  }
}
