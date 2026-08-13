/// Linha de `public.cashbacks` — porta de `CashbackPanel.jsx`.
class Cashback {
  const Cashback({
    required this.id,
    required this.ownerId,
    required this.status,
    required this.createdAt,
    this.cashbackAmount,
    this.reason,
    this.expiresAt,
  });

  final String id;
  final String ownerId;
  final String status; // disponivel | resgatado | expirado
  final DateTime createdAt;
  final num? cashbackAmount;
  final String? reason;
  final DateTime? expiresAt;

  factory Cashback.fromJson(Map<String, dynamic> json) {
    return Cashback(
      id: json['id'] as String,
      ownerId: json['owner_id'] as String,
      status: json['status'] as String? ?? 'disponivel',
      createdAt: DateTime.parse(json['created_at'] as String),
      cashbackAmount: json['cashback_amount'] as num?,
      reason: json['reason'] as String?,
      expiresAt: json['expires_at'] == null ? null : DateTime.parse(json['expires_at'] as String),
    );
  }
}
