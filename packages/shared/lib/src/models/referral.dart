/// Linha de `public.referrals` — porta de `ReferralCard.jsx`.
class Referral {
  const Referral({
    required this.id,
    required this.referrerId,
    required this.referralCode,
    required this.rewardStatus,
    required this.createdAt,
    this.referredClientId,
  });

  final String id;
  final String referrerId;
  final String referralCode;
  final String rewardStatus; // pendente | convertido
  final DateTime createdAt;
  final String? referredClientId;

  factory Referral.fromJson(Map<String, dynamic> json) {
    return Referral(
      id: json['id'] as String,
      referrerId: json['referrer_id'] as String,
      referralCode: json['referral_code'] as String,
      rewardStatus: json['reward_status'] as String? ?? 'pendente',
      createdAt: DateTime.parse(json['created_at'] as String),
      referredClientId: json['referred_client_id'] as String?,
    );
  }
}
