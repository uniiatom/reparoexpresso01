/// Linha da tabela `public.providers`. **Atenção:** o schema real diverge
/// do que este repositório assumia — reestruturação feita fora do git (ver
/// /MIGRATION.md, seção 0.1). Campos fictícios do model antigo (`specialties`,
/// `cnh_*`/`crlv_*`/`cnpj_*` como colunas próprias, `is_rejected`,
/// `block_reason` etc.) foram removidos; o schema real usa
/// `id_holding_document_*`/`address_proof_*` (dois slots de documento
/// genéricos) + `company_name`/`company_fantasy_name` (dados de CNPJ,
/// sem a coluna do número em si) + `crlv_vehicle_type` (só o tipo, sem
/// arquivo). Habilidades do prestador agora vivem em `provider_professions`/
/// `provider_sub_services` (tabelas separadas, não colunas aqui).
class Provider {
  const Provider({
    required this.id,
    this.userId,
    required this.name,
    required this.createdAt,
    required this.updatedAt,
    this.phone,
    this.email,
    this.photoUrl,
    this.bio,
    this.address,
    this.neighborhood,
    this.city,
    this.state,
    this.latitude,
    this.longitude,
    this.isOnline = false,
    this.isApproved = false,
    this.isBlocked = false,
    this.isServiceEnabled = true,
    this.rejectionReason,
    this.rating = 5,
    this.totalReviews = 0,
    this.approvalRequestType,
    this.approvalRequestedAt,
    this.companyName,
    this.companyFantasyName,
    this.addressProofUrl,
    this.addressProofStatus = 'nao_enviado',
    this.addressProofRejectionReason,
    this.legalRepIdUrl,
    this.fiscalDataVerified = false,
    this.fiscalDataVerifiedAt,
    this.idHoldingDocumentUrl,
    this.idHoldingDocumentStatus = 'nao_enviado',
    this.idHoldingDocumentRejectionReason,
    this.crlvVehicleType,
  });

  final String id;
  final String? userId;
  final String name;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? phone;
  final String? email;
  final String? photoUrl;
  final String? bio;
  final String? address;
  final String? neighborhood;
  final String? city;
  final String? state;
  final double? latitude;
  final double? longitude;
  final bool isOnline;
  final bool isApproved;
  final bool isBlocked;
  final bool isServiceEnabled;
  final String? rejectionReason;
  final num rating;
  final int totalReviews;
  final String? approvalRequestType; // 'initial' | 'update'
  final DateTime? approvalRequestedAt;
  final String? companyName;
  final String? companyFantasyName;
  final String? addressProofUrl;
  final String addressProofStatus;
  final String? addressProofRejectionReason;
  final String? legalRepIdUrl;
  final bool fiscalDataVerified;
  final DateTime? fiscalDataVerifiedAt;
  final String? idHoldingDocumentUrl;
  final String idHoldingDocumentStatus;
  final String? idHoldingDocumentRejectionReason;
  final String? crlvVehicleType;

  /// Elegível a receber chamados: aprovado, não bloqueado.
  bool get isAvailableForJobs => isApproved && !isBlocked;

  /// Não há coluna `is_rejected` no schema real — reprovado é inferido por
  /// `rejection_reason` preenchido enquanto ainda não aprovado.
  bool get isRejected => !isApproved && rejectionReason != null;

  factory Provider.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(Object? v) => v == null ? null : DateTime.parse(v as String);
    double? parseDouble(Object? v) => v == null ? null : (v as num).toDouble();

    return Provider(
      id: json['id'] as String,
      userId: json['user_id'] as String?,
      name: json['name'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      photoUrl: json['photo_url'] as String?,
      bio: json['bio'] as String?,
      address: json['address'] as String?,
      neighborhood: json['neighborhood'] as String?,
      city: json['city'] as String?,
      state: json['state'] as String?,
      latitude: parseDouble(json['latitude']),
      longitude: parseDouble(json['longitude']),
      isOnline: json['is_online'] as bool? ?? false,
      isApproved: json['is_approved'] as bool? ?? false,
      isBlocked: json['is_blocked'] as bool? ?? false,
      isServiceEnabled: json['is_service_enabled'] as bool? ?? true,
      rejectionReason: json['rejection_reason'] as String?,
      rating: json['rating'] as num? ?? 5,
      totalReviews: json['total_reviews'] as int? ?? 0,
      approvalRequestType: json['approval_request_type'] as String?,
      approvalRequestedAt: parseDate(json['approval_requested_at']),
      companyName: json['company_name'] as String?,
      companyFantasyName: json['company_fantasy_name'] as String?,
      addressProofUrl: json['address_proof_url'] as String?,
      addressProofStatus: json['address_proof_status'] as String? ?? 'nao_enviado',
      addressProofRejectionReason: json['address_proof_rejection_reason'] as String?,
      legalRepIdUrl: json['legal_rep_id_url'] as String?,
      fiscalDataVerified: json['fiscal_data_verified'] as bool? ?? false,
      fiscalDataVerifiedAt: parseDate(json['fiscal_data_verified_at']),
      idHoldingDocumentUrl: json['id_holding_document_url'] as String?,
      idHoldingDocumentStatus: json['id_holding_document_status'] as String? ?? 'nao_enviado',
      idHoldingDocumentRejectionReason: json['id_holding_document_rejection_reason'] as String?,
      crlvVehicleType: json['crlv_vehicle_type'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'user_id': userId,
        'name': name,
        'created_at': createdAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
        'phone': phone,
        'email': email,
        'photo_url': photoUrl,
        'bio': bio,
        'address': address,
        'neighborhood': neighborhood,
        'city': city,
        'state': state,
        'latitude': latitude,
        'longitude': longitude,
        'is_online': isOnline,
        'is_approved': isApproved,
        'is_blocked': isBlocked,
        'is_service_enabled': isServiceEnabled,
        'rejection_reason': rejectionReason,
        'rating': rating,
        'total_reviews': totalReviews,
        'company_name': companyName,
        'company_fantasy_name': companyFantasyName,
        'crlv_vehicle_type': crlvVehicleType,
      };
}
