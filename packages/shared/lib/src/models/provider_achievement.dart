/// Linha de `public.provider_achievements` — porta de `ProviderAwards.jsx`.
/// Nível/badges são calculados pela Edge Function `calculateProviderLevel`
/// (já ativa no Supabase); aqui só exibimos o resultado.
class ProviderAchievement {
  const ProviderAchievement({
    required this.id,
    required this.level,
    required this.totalJobsCompleted,
    required this.averageRating,
    this.achievementsUnlocked = const [],
    this.visibilityBonusPercent = 0,
  });

  final String id;
  final int level;
  final int totalJobsCompleted;
  final num averageRating;
  final List<String> achievementsUnlocked;
  final num visibilityBonusPercent;

  static const levelNames = {1: 'Iniciante', 2: 'Pro', 3: 'Elite', 4: 'Lendário', 5: 'Imperador'};
  static const cashbackPercentByLevel = {1: 2, 2: 3, 3: 4, 4: 5, 5: 7};

  String get levelName => levelNames[level] ?? 'Iniciante';

  factory ProviderAchievement.fromJson(Map<String, dynamic> json) {
    return ProviderAchievement(
      id: json['id'] as String,
      level: json['level'] as int? ?? 1,
      totalJobsCompleted: json['total_jobs_completed'] as int? ?? 0,
      averageRating: json['average_rating'] as num? ?? 5,
      achievementsUnlocked: (json['achievements_unlocked'] as List?)?.cast<String>() ?? const [],
      visibilityBonusPercent: json['visibility_bonus_percent'] as num? ?? 0,
    );
  }
}
