/// Linha de `public.monthly_goals` — meta mensal de desempenho com bônus
/// pros 3 primeiros colocados. Staff-only.
class MonthlyGoal {
  const MonthlyGoal({
    required this.id,
    required this.month,
    this.minJobs,
    this.minRating,
    this.minPunctuality,
    this.bonus1st,
    this.bonus2nd,
    this.bonus3rd,
    this.bonusReleased = false,
  });

  final String id;
  final String month;
  final int? minJobs;
  final num? minRating;
  final num? minPunctuality;
  final num? bonus1st;
  final num? bonus2nd;
  final num? bonus3rd;
  final bool bonusReleased;

  factory MonthlyGoal.fromJson(Map<String, dynamic> json) {
    return MonthlyGoal(
      id: json['id'] as String,
      month: json['month'] as String,
      minJobs: json['min_jobs'] as int?,
      minRating: json['min_rating'] as num?,
      minPunctuality: json['min_punctuality'] as num?,
      bonus1st: json['bonus_1st'] as num?,
      bonus2nd: json['bonus_2nd'] as num?,
      bonus3rd: json['bonus_3rd'] as num?,
      bonusReleased: json['bonus_released'] as bool? ?? false,
    );
  }
}
