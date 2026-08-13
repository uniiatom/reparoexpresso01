/// Linha de `public.reserve_funds` — porta de `AdminReserveFundDashboard.jsx`
/// e `ProviderReserveFund.jsx`.
class ReserveFund {
  const ReserveFund({
    required this.id,
    required this.status,
    required this.totalAccumulated,
    required this.blockedAmount,
    required this.availableAmount,
    this.providerName,
  });

  final String id;
  final String status;
  final num totalAccumulated;
  final num blockedAmount;
  final num availableAmount;
  final String? providerName;

  factory ReserveFund.fromJson(Map<String, dynamic> json) {
    return ReserveFund(
      id: json['id'] as String,
      status: json['status'] as String? ?? 'ativo',
      totalAccumulated: json['total_accumulated'] as num? ?? 0,
      blockedAmount: json['blocked_amount'] as num? ?? 0,
      availableAmount: json['available_amount'] as num? ?? 0,
      providerName: json['provider_name'] as String?,
    );
  }
}
