/// Linha de `public.reserve_fund_transactions` — histórico de
/// movimentações do fundo de reserva de um prestador (retenção/liberação).
/// Staff-only (`is_staff()`), ver `finance_tab.dart`.
class ReserveFundTransaction {
  const ReserveFundTransaction({
    required this.id,
    required this.createdAt,
    this.reserveFundId,
    this.providerId,
    this.serviceRequestId,
    this.type,
    this.amount,
    this.reason,
    this.status,
  });

  final String id;
  final DateTime createdAt;
  final String? reserveFundId;
  final String? providerId;
  final String? serviceRequestId;
  final String? type;
  final num? amount;
  final String? reason;
  final String? status;

  factory ReserveFundTransaction.fromJson(Map<String, dynamic> json) {
    return ReserveFundTransaction(
      id: json['id'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      reserveFundId: json['reserve_fund_id'] as String?,
      providerId: json['provider_id'] as String?,
      serviceRequestId: json['service_request_id'] as String?,
      type: json['type'] as String?,
      amount: json['amount'] as num?,
      reason: json['reason'] as String?,
      status: json['status'] as String?,
    );
  }
}
