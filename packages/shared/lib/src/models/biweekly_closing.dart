/// Linha de `public.biweekly_closings` — porta de `BiweeklyClosingAdmin.jsx`.
class BiweeklyClosing {
  const BiweeklyClosing({
    required this.id,
    required this.status,
    required this.grossAmount,
    required this.netAmount,
    required this.totalServices,
    required this.createdAt,
    this.providerName,
    this.periodLabel,
  });

  final String id;
  final String status;
  final num grossAmount;
  final num netAmount;
  final int totalServices;
  final DateTime createdAt;
  final String? providerName;
  final String? periodLabel;

  factory BiweeklyClosing.fromJson(Map<String, dynamic> json) {
    return BiweeklyClosing(
      id: json['id'] as String,
      status: json['status'] as String? ?? 'pendente',
      grossAmount: json['gross_amount'] as num? ?? 0,
      netAmount: json['net_amount'] as num? ?? 0,
      totalServices: json['total_services'] as int? ?? 0,
      createdAt: DateTime.parse(json['created_at'] as String),
      providerName: json['provider_name'] as String?,
      periodLabel: json['period_label'] as String?,
    );
  }
}
