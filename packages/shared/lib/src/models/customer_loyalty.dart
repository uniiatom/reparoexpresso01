/// Linha de `public.customer_loyalty`.
class CustomerLoyalty {
  const CustomerLoyalty({
    required this.id,
    required this.clientId,
    required this.tier,
    required this.totalPoints,
    required this.availablePoints,
    required this.usedPoints,
  });

  final String id;
  final String clientId;
  final String tier;
  final int totalPoints;
  final int availablePoints;
  final int usedPoints;

  factory CustomerLoyalty.fromJson(Map<String, dynamic> json) {
    return CustomerLoyalty(
      id: json['id'] as String,
      clientId: json['client_id'] as String,
      tier: json['tier'] as String? ?? 'bronze',
      totalPoints: json['total_points'] as int? ?? 0,
      availablePoints: json['available_points'] as int? ?? 0,
      usedPoints: json['used_points'] as int? ?? 0,
    );
  }
}

/// Linha de `public.loyalty_transactions`.
class LoyaltyTransaction {
  const LoyaltyTransaction({
    required this.id,
    required this.type,
    required this.points,
    required this.createdAt,
    this.description,
  });

  final String id;
  final String type;
  final int points;
  final DateTime createdAt;
  final String? description;

  factory LoyaltyTransaction.fromJson(Map<String, dynamic> json) {
    return LoyaltyTransaction(
      id: json['id'] as String,
      type: json['type'] as String,
      points: json['points'] as int,
      createdAt: DateTime.parse(json['created_at'] as String),
      description: json['description'] as String?,
    );
  }
}
