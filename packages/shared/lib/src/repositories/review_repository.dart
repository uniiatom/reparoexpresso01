import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/review.dart';

/// Porta de `legacy/src/components/DetailedRatingModal.jsx`. RLS de
/// `reviews` libera `is_staff()` ou o próprio `client_id` dono da review.
class ReviewRepository {
  ReviewRepository(this._client);

  final SupabaseClient _client;

  Future<List<Review>> listByProvider(String providerId) async {
    final data = await _client
        .from('reviews')
        .select()
        .eq('provider_id', providerId)
        .order('created_at', ascending: false);
    return data.map(Review.fromJson).toList();
  }

  /// Cria a avaliação detalhada. `isDetailed` (comentário >= 20 caracteres
  /// + ao menos 1 foto) é calculado pelo chamador — mesma regra do legado —
  /// e decide se o cliente ganha a recompensa de "Avaliador de Elite"
  /// (ver `grantEliteReviewerBadge`, chamada separadamente pela UI).
  Future<void> create({
    required String providerId,
    required String serviceRequestId,
    required num overallRating,
    required num punctualityRating,
    required num qualityRating,
    required num behaviorRating,
    String? comment,
    String? serviceDescription,
    List<String> photos = const [],
    bool isDetailed = false,
  }) async {
    final uid = _client.auth.currentUser?.id;
    await _client.from('reviews').insert({
      'professional_id': providerId,
      'provider_id': providerId,
      'service_request_id': serviceRequestId,
      'client_id': uid,
      'overall_rating': overallRating,
      'punctuality_rating': punctualityRating,
      'quality_rating': qualityRating,
      'behavior_rating': behaviorRating,
      'comment': comment,
      'service_description': serviceDescription,
      'review_photos': photos,
      'is_detailed': isDetailed,
    });
  }

  /// Concede 50 pontos de fidelidade + badge "Avaliador de Elite" —
  /// via Edge Function `grantEliteReviewerBadge` (idempotente por
  /// `serviceRequestId`, chamar só quando `isDetailed` for true).
  Future<void> grantEliteBadge(String serviceRequestId) async {
    final user = _client.auth.currentUser;
    if (user == null) return;
    await _client.functions.invoke('grantEliteReviewerBadge', body: {
      'serviceRequestId': serviceRequestId,
      'clientId': user.id,
      'clientEmail': user.email,
    });
  }
}
