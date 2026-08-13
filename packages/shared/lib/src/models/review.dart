/// Linha de `public.reviews` — avaliação detalhada pós-serviço (nota geral
/// + critérios + fotos), distinta da nota simples salva em
/// `service_requests.rating_client`. Porta de `DetailedRatingModal.jsx`.
class Review {
  const Review({
    required this.id,
    required this.providerId,
    required this.overallRating,
    required this.createdAt,
    this.serviceRequestId,
    this.clientId,
    this.clientName,
    this.punctualityRating,
    this.qualityRating,
    this.behaviorRating,
    this.comment,
    this.serviceDescription,
    this.reviewPhotos = const [],
    this.isDetailed = false,
  });

  final String id;
  final String providerId;
  final num overallRating;
  final DateTime createdAt;
  final String? serviceRequestId;
  final String? clientId;
  final String? clientName;
  final num? punctualityRating;
  final num? qualityRating;
  final num? behaviorRating;
  final String? comment;
  final String? serviceDescription;
  final List<String> reviewPhotos;
  final bool isDetailed;

  factory Review.fromJson(Map<String, dynamic> json) {
    return Review(
      id: json['id'] as String,
      providerId: json['provider_id'] as String,
      overallRating: json['overall_rating'] as num? ?? 0,
      createdAt: DateTime.parse(json['created_at'] as String),
      serviceRequestId: json['service_request_id'] as String?,
      clientId: json['client_id'] as String?,
      clientName: json['client_name'] as String?,
      punctualityRating: json['punctuality_rating'] as num?,
      qualityRating: json['quality_rating'] as num?,
      behaviorRating: json['behavior_rating'] as num?,
      comment: json['comment'] as String?,
      serviceDescription: json['service_description'] as String?,
      reviewPhotos: (json['review_photos'] as List?)?.cast<String>() ?? const [],
      isDetailed: json['is_detailed'] as bool? ?? false,
    );
  }
}
