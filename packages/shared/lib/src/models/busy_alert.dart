/// Linha de `public.busy_alerts` — aviso disparado quando não há
/// prestador disponível pra um cliente, notificando prestadores próximos
/// pra que respondam. Staff-only (`is_staff()`).
class BusyAlert {
  const BusyAlert({
    required this.id,
    required this.createdAt,
    this.clientName,
    this.serviceType,
    this.serviceDescription,
    this.clientAddress,
    this.status = 'aguardando',
    this.expiresAt,
  });

  final String id;
  final DateTime createdAt;
  final String? clientName;
  final String? serviceType;
  final String? serviceDescription;
  final String? clientAddress;
  final String status;
  final DateTime? expiresAt;

  factory BusyAlert.fromJson(Map<String, dynamic> json) {
    return BusyAlert(
      id: json['id'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      clientName: json['client_name'] as String?,
      serviceType: json['service_type'] as String?,
      serviceDescription: json['service_description'] as String?,
      clientAddress: json['client_address'] as String?,
      status: json['status'] as String? ?? 'aguardando',
      expiresAt: json['expires_at'] == null ? null : DateTime.parse(json['expires_at'] as String),
    );
  }
}
