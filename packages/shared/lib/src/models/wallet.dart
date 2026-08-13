/// Linha de `public.wallets`. `ownerType` é `'client'` ou `'provider'`.
class Wallet {
  const Wallet({
    required this.id,
    required this.ownerId,
    required this.ownerType,
    required this.balance,
    required this.pendingBalance,
    required this.totalEarned,
    required this.totalWithdrawn,
    this.ownerName,
    this.pixKey,
    this.pixKeyType,
    this.isActive = true,
  });

  final String id;
  final String ownerId;
  final String ownerType;
  final num balance;
  final num pendingBalance;
  final num totalEarned;
  final num totalWithdrawn;
  final String? ownerName;
  final String? pixKey;
  final String? pixKeyType;
  final bool isActive;

  factory Wallet.fromJson(Map<String, dynamic> json) {
    return Wallet(
      id: json['id'] as String,
      ownerId: json['owner_id'] as String,
      ownerType: json['owner_type'] as String,
      balance: json['balance'] as num? ?? 0,
      pendingBalance: json['pending_balance'] as num? ?? 0,
      totalEarned: json['total_earned'] as num? ?? 0,
      totalWithdrawn: json['total_withdrawn'] as num? ?? 0,
      ownerName: json['owner_name'] as String?,
      pixKey: json['pix_key'] as String?,
      pixKeyType: json['pix_key_type'] as String?,
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}

/// Linha de `public.wallet_transactions`.
class WalletTransaction {
  const WalletTransaction({
    required this.id,
    required this.type,
    required this.amount,
    required this.status,
    required this.createdAt,
    this.description,
    this.balanceAfter,
  });

  final String id;
  final String type;
  final num amount;
  final String status;
  final DateTime createdAt;
  final String? description;
  final num? balanceAfter;

  factory WalletTransaction.fromJson(Map<String, dynamic> json) {
    return WalletTransaction(
      id: json['id'] as String,
      type: json['type'] as String,
      amount: json['amount'] as num,
      status: json['status'] as String? ?? 'pending',
      createdAt: DateTime.parse(json['created_at'] as String),
      description: json['description'] as String?,
      balanceAfter: json['balance_after'] as num?,
    );
  }
}
