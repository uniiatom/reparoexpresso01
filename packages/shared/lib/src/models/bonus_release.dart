/// Linha de `public.bonus_releases` — ranking/bônus liberado a um
/// prestador dentro de uma `monthly_goals`. Staff-only.
class BonusRelease {
  const BonusRelease({
    required this.id,
    this.month,
    this.goalId,
    this.providerId,
    this.providerName,
    this.rank,
    this.jobsCompleted,
    this.avgRating,
    this.bonusAmount,
    this.status = 'pendente',
  });

  final String id;
  final String? month;
  final String? goalId;
  final String? providerId;
  final String? providerName;
  final int? rank;
  final int? jobsCompleted;
  final num? avgRating;
  final num? bonusAmount;
  final String status;

  factory BonusRelease.fromJson(Map<String, dynamic> json) {
    return BonusRelease(
      id: json['id'] as String,
      month: json['month'] as String?,
      goalId: json['goal_id'] as String?,
      providerId: json['provider_id'] as String?,
      providerName: json['provider_name'] as String?,
      rank: json['rank'] as int?,
      jobsCompleted: json['jobs_completed'] as int?,
      avgRating: json['avg_rating'] as num?,
      bonusAmount: json['bonus_amount'] as num?,
      status: json['status'] as String? ?? 'pendente',
    );
  }
}
