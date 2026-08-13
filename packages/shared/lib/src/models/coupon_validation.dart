/// Resultado de `validateCoupon` — porta de `CouponInput.jsx`.
class CouponValidation {
  const CouponValidation({
    required this.valid,
    this.message,
    this.couponId,
    this.couponCode,
    this.discountAmount,
    this.finalAmount,
  });

  final bool valid;
  final String? message;
  final String? couponId;
  final String? couponCode;
  final num? discountAmount;
  final num? finalAmount;

  factory CouponValidation.fromJson(Map<String, dynamic> json) {
    return CouponValidation(
      valid: json['valid'] as bool? ?? false,
      message: json['message'] as String?,
      couponId: json['coupon_id'] as String?,
      couponCode: json['coupon_code'] as String?,
      discountAmount: json['discount_amount'] as num?,
      finalAmount: json['final_amount'] as num?,
    );
  }
}
