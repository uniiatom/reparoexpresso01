/// Linha de `public.invoices` — porta de `InvoicesAdmin.jsx`.
class Invoice {
  const Invoice({
    required this.id,
    required this.status,
    required this.createdAt,
    this.providerName,
    this.invoiceNumber,
    this.amount,
    this.issueDate,
  });

  final String id;
  final String status;
  final DateTime createdAt;
  final String? providerName;
  final String? invoiceNumber;
  final num? amount;
  final DateTime? issueDate;

  factory Invoice.fromJson(Map<String, dynamic> json) {
    return Invoice(
      id: json['id'] as String,
      status: json['status'] as String? ?? 'pendente',
      createdAt: DateTime.parse(json['created_at'] as String),
      providerName: json['provider_name'] as String?,
      invoiceNumber: json['invoice_number'] as String?,
      amount: json['amount'] as num?,
      issueDate: json['issue_date'] == null ? null : DateTime.parse(json['issue_date'] as String),
    );
  }
}
