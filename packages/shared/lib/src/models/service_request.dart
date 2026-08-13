import 'service_request_status.dart';

/// Linha da tabela `public.service_requests`. **Atenção:** o schema real
/// diverge do que as migrations deste repo descrevem — uma reestruturação
/// paralela (fora deste git, ver /MIGRATION.md) trocou a antiga coluna
/// `service_type` (texto livre) por `profession_id`/`sub_service_id`,
/// apontando pro catálogo novo (`professions`/`sub_services`). `clientId`
/// também mudou de sentido: hoje é FK pra `clients.id`, não mais o
/// `auth.uid()` direto — ver `ServiceRequestRepository`.
class ServiceRequest {
  const ServiceRequest({
    required this.id,
    required this.clientId,
    required this.professionId,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.subServiceId,
    this.professionName,
    this.subServiceName,
    this.notes,
    this.serviceNumber,
    this.clientName,
    this.clientPhone,
    this.createdBy,
    this.referralCode,
    this.description,
    this.clientSuggestedPrice,
    this.problemPhotos = const [],
    // Localização do serviço
    this.address,
    this.number,
    this.neighborhood,
    this.city,
    this.state,
    this.cep,
    this.latitude,
    this.longitude,
    this.clientLatitude,
    this.clientLongitude,
    // Reboque: origem/destino
    this.deliveryAddress,
    this.deliveryNumber,
    this.deliveryNeighborhood,
    this.deliveryCity,
    this.deliveryState,
    this.deliveryCep,
    this.deliveryLatitude,
    this.deliveryLongitude,
    this.towDistanceKm,
    // Agendamento
    this.modality = 'imediato',
    this.scheduledDate,
    this.scheduledTime,
    this.urgency = 'agora',
    // Prestador atribuído
    this.providerId,
    this.providerName,
    this.providerPhone,
    this.providerLatitude,
    this.providerLongitude,
    this.estimatedArrivalMinutes,
    // Preço
    this.estimatedPrice,
    this.finalPrice,
    this.couponId,
    this.couponCode,
    this.discountAmount,
    this.originalPrice,
    this.nightSurcharge = false,
    this.weekendSurcharge = false,
    this.holidaySurcharge = false,
    // Avaliação e encerramento
    this.ratingClient,
    this.ratingComment,
    this.securityPassword,
    this.validationPassword,
    this.passwordsGeneratedAt,
    this.declineReason,
    this.additionalPoints = const [],
    this.checklist,
    this.extraCharges,
    this.partsReturnDeadline,
    this.techVisitReason,
    this.warrantyEndDate,
    this.warrantyStatus = 'ativa',
  });

  final String id;
  final String clientId;
  final String professionId;
  final String? subServiceId;
  final String? professionName;
  final String? subServiceName;
  final ServiceRequestStatus status;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? notes;
  final String? serviceNumber;
  final String? clientName;
  final String? clientPhone;
  final String? createdBy;
  final String? referralCode;
  final String? description;
  final num? clientSuggestedPrice;
  final List<String> problemPhotos;

  final String? address;
  final String? number;
  final String? neighborhood;
  final String? city;
  final String? state;
  final String? cep;
  final double? latitude;
  final double? longitude;
  final double? clientLatitude;
  final double? clientLongitude;

  final String? deliveryAddress;
  final String? deliveryNumber;
  final String? deliveryNeighborhood;
  final String? deliveryCity;
  final String? deliveryState;
  final String? deliveryCep;
  final double? deliveryLatitude;
  final double? deliveryLongitude;
  final num? towDistanceKm;

  final String modality;
  final DateTime? scheduledDate;
  final String? scheduledTime;
  final String urgency;

  final String? providerId;
  final String? providerName;
  final String? providerPhone;
  final double? providerLatitude;
  final double? providerLongitude;
  final int? estimatedArrivalMinutes;

  final num? estimatedPrice;
  final num? finalPrice;
  final String? couponId;
  final String? couponCode;
  final num? discountAmount;
  final num? originalPrice;
  final bool nightSurcharge;
  final bool weekendSurcharge;
  final bool holidaySurcharge;

  final num? ratingClient;
  final String? ratingComment;
  final String? securityPassword;
  final String? validationPassword;
  final DateTime? passwordsGeneratedAt;
  final String? declineReason;
  final List<dynamic> additionalPoints;
  final Map<String, dynamic>? checklist;
  final Map<String, dynamic>? extraCharges;
  final DateTime? partsReturnDeadline;
  final String? techVisitReason;
  final DateTime? warrantyEndDate;
  final String warrantyStatus;

  /// Nome pra exibir na UI — sub-serviço se houver (mais específico), senão
  /// a profissão. Só populado quando a query fez o embed de
  /// `professions(name)`/`sub_services(name)` (ver `ServiceRequestRepository`).
  String get serviceLabel => subServiceName ?? professionName ?? 'Serviço';

  factory ServiceRequest.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(Object? v) => v == null ? null : DateTime.parse(v as String);
    double? parseDouble(Object? v) => v == null ? null : (v as num).toDouble();
    String? embedName(Object? v) => v is Map ? v['name'] as String? : null;

    return ServiceRequest(
      id: json['id'] as String,
      clientId: json['client_id'] as String,
      professionId: json['profession_id'] as String,
      subServiceId: json['sub_service_id'] as String?,
      professionName: embedName(json['professions']),
      subServiceName: embedName(json['sub_services']),
      status: ServiceRequestStatus.fromDbValue(json['status'] as String),
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      notes: json['notes'] as String?,
      serviceNumber: json['service_number'] as String?,
      clientName: json['client_name'] as String?,
      clientPhone: json['client_phone'] as String?,
      createdBy: json['created_by'] as String?,
      referralCode: json['referral_code'] as String?,
      description: json['description'] as String?,
      clientSuggestedPrice: json['client_suggested_price'] as num?,
      problemPhotos: (json['problem_photos'] as List?)?.cast<String>() ?? const [],
      address: json['address'] as String?,
      number: json['number'] as String?,
      neighborhood: json['neighborhood'] as String?,
      city: json['city'] as String?,
      state: json['state'] as String?,
      cep: json['cep'] as String?,
      latitude: parseDouble(json['latitude']),
      longitude: parseDouble(json['longitude']),
      clientLatitude: parseDouble(json['client_latitude']),
      clientLongitude: parseDouble(json['client_longitude']),
      deliveryAddress: json['delivery_address'] as String?,
      deliveryNumber: json['delivery_number'] as String?,
      deliveryNeighborhood: json['delivery_neighborhood'] as String?,
      deliveryCity: json['delivery_city'] as String?,
      deliveryState: json['delivery_state'] as String?,
      deliveryCep: json['delivery_cep'] as String?,
      deliveryLatitude: parseDouble(json['delivery_latitude']),
      deliveryLongitude: parseDouble(json['delivery_longitude']),
      towDistanceKm: json['tow_distance_km'] as num?,
      modality: json['modality'] as String? ?? 'imediato',
      scheduledDate: parseDate(json['scheduled_date']),
      scheduledTime: json['scheduled_time'] as String?,
      urgency: json['urgency'] as String? ?? 'agora',
      providerId: json['provider_id'] as String?,
      providerName: json['provider_name'] as String?,
      providerPhone: json['provider_phone'] as String?,
      providerLatitude: parseDouble(json['provider_latitude']),
      providerLongitude: parseDouble(json['provider_longitude']),
      estimatedArrivalMinutes: json['estimated_arrival_minutes'] as int?,
      estimatedPrice: json['estimated_price'] as num?,
      finalPrice: json['final_price'] as num?,
      couponId: json['coupon_id'] as String?,
      couponCode: json['coupon_code'] as String?,
      discountAmount: json['discount_amount'] as num?,
      originalPrice: json['original_price'] as num?,
      nightSurcharge: json['night_surcharge'] as bool? ?? false,
      weekendSurcharge: json['weekend_surcharge'] as bool? ?? false,
      holidaySurcharge: json['holiday_surcharge'] as bool? ?? false,
      ratingClient: json['rating_client'] as num?,
      ratingComment: json['rating_comment'] as String?,
      securityPassword: json['security_password'] as String?,
      validationPassword: json['validation_password'] as String?,
      passwordsGeneratedAt: parseDate(json['passwords_generated_at']),
      declineReason: json['decline_reason'] as String?,
      additionalPoints: (json['additional_points'] as List?) ?? const [],
      checklist: json['checklist'] as Map<String, dynamic>?,
      extraCharges: json['extra_charges'] as Map<String, dynamic>?,
      partsReturnDeadline: parseDate(json['parts_return_deadline']),
      techVisitReason: json['tech_visit_reason'] as String?,
      warrantyEndDate: parseDate(json['warranty_end_date']),
      warrantyStatus: json['warranty_status'] as String? ?? 'ativa',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'client_id': clientId,
        'profession_id': professionId,
        'sub_service_id': subServiceId,
        'status': status.dbValue,
        'created_at': createdAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
        'notes': notes,
        'service_number': serviceNumber,
        'client_name': clientName,
        'client_phone': clientPhone,
        'created_by': createdBy,
        'referral_code': referralCode,
        'description': description,
        'client_suggested_price': clientSuggestedPrice,
        'problem_photos': problemPhotos,
        'address': address,
        'number': number,
        'neighborhood': neighborhood,
        'city': city,
        'state': state,
        'cep': cep,
        'latitude': latitude,
        'longitude': longitude,
        'client_latitude': clientLatitude,
        'client_longitude': clientLongitude,
        'delivery_address': deliveryAddress,
        'delivery_number': deliveryNumber,
        'delivery_neighborhood': deliveryNeighborhood,
        'delivery_city': deliveryCity,
        'delivery_state': deliveryState,
        'delivery_cep': deliveryCep,
        'delivery_latitude': deliveryLatitude,
        'delivery_longitude': deliveryLongitude,
        'tow_distance_km': towDistanceKm,
        'modality': modality,
        'scheduled_date': scheduledDate?.toIso8601String().split('T').first,
        'scheduled_time': scheduledTime,
        'urgency': urgency,
        'provider_id': providerId,
        'provider_name': providerName,
        'provider_phone': providerPhone,
        'provider_latitude': providerLatitude,
        'provider_longitude': providerLongitude,
        'estimated_arrival_minutes': estimatedArrivalMinutes,
        'estimated_price': estimatedPrice,
        'final_price': finalPrice,
        'coupon_id': couponId,
        'coupon_code': couponCode,
        'discount_amount': discountAmount,
        'original_price': originalPrice,
        'night_surcharge': nightSurcharge,
        'weekend_surcharge': weekendSurcharge,
        'holiday_surcharge': holidaySurcharge,
        'rating_client': ratingClient,
        'rating_comment': ratingComment,
        'decline_reason': declineReason,
        'additional_points': additionalPoints,
        'checklist': checklist,
        'extra_charges': extraCharges,
        'tech_visit_reason': techVisitReason,
        'warranty_end_date': warrantyEndDate?.toIso8601String(),
        'warranty_status': warrantyStatus,
      };
}
