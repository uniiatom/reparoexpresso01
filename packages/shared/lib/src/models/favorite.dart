/// Linha de `public.favorites`.
class Favorite {
  const Favorite({
    required this.id,
    required this.providerId,
    required this.createdAt,
    this.providerName,
    this.providerPhotoUrl,
    this.providerRating,
    this.providerCity,
    this.providerState,
  });

  final String id;
  final String providerId;
  final DateTime createdAt;
  final String? providerName;
  final String? providerPhotoUrl;
  final num? providerRating;
  final String? providerCity;
  final String? providerState;

  factory Favorite.fromJson(Map<String, dynamic> json) {
    return Favorite(
      id: json['id'] as String,
      providerId: json['provider_id'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      providerName: json['provider_name'] as String?,
      providerPhotoUrl: json['provider_photo_url'] as String?,
      providerRating: json['provider_rating'] as num?,
      providerCity: json['provider_city'] as String?,
      providerState: json['provider_state'] as String?,
    );
  }
}
