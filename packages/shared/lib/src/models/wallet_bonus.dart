/// Linha de `public.wallet_bonuses` — bônus creditado na carteira
/// (indicação, promoção etc.), distinto de `wallet_transactions`.
class WalletBonus {
  const WalletBonus({
    required this.id,
    required this.ownerId,
    required this.amount,
    required this.createdAt,
    this.ownerName,
    this.reason,
    this.relatedCouponCode,
    this.relatedServiceRequestId,
    this.validationStatus,
    this.isUsed = false,
    this.usedAt,
    this.expiresAt,
  });

  final String id;
  final String ownerId;
  final num amount;
  final DateTime createdAt;
  final String? ownerName;
  final String? reason;
  final String? relatedCouponCode;
  final String? relatedServiceRequestId;
  final String? validationStatus;
  final bool isUsed;
  final DateTime? usedAt;
  final DateTime? expiresAt;

  factory WalletBonus.fromJson(Map<String, dynamic> json) {
    return WalletBonus(
      id: json['id'] as String,
      ownerId: json['owner_id'] as String,
      amount: json['amount'] as num? ?? 0,
      createdAt: DateTime.parse(json['created_at'] as String),
      ownerName: json['owner_name'] as String?,
      reason: json['reason'] as String?,
      relatedCouponCode: json['related_coupon_code'] as String?,
      relatedServiceRequestId: json['related_service_request_id'] as String?,
      validationStatus: json['validation_status'] as String?,
      isUsed: json['is_used'] as bool? ?? false,
      usedAt: json['used_at'] == null ? null : DateTime.parse(json['used_at'] as String),
      expiresAt: json['expires_at'] == null ? null : DateTime.parse(json['expires_at'] as String),
    );
  }
}
