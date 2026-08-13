import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/coupon_validation.dart';

/// Porta de `legacy/src/components/PaymentModal.jsx` +
/// `PixPaymentModal.jsx` + `CouponInput.jsx`. Sem SDK nativo do Stripe
/// (`flutter_stripe`) — usa a sessão de Checkout hospedada do Stripe
/// (`sessionUrl`), aberta no navegador via `url_launcher`. PIX retorna o
/// código "copia e cola"; renderizar como QR fica de fora por enquanto
/// (ver checklist da Fase 3 em /MIGRATION.md).
class PaymentRepository {
  PaymentRepository(this._client);

  final SupabaseClient _client;

  /// Retorna a URL do Stripe Checkout hospedado para abrir no navegador.
  Future<String> createCheckoutSession({
    required String serviceRequestId,
    required num amount,
    required String serviceName,
    String? couponId,
    String? couponCode,
    num? discountAmount,
    num? originalPrice,
  }) async {
    final response = await _client.functions.invoke('createCheckoutSession', body: {
      'serviceRequestId': serviceRequestId,
      'amount': amount,
      'serviceName': serviceName,
      'couponId': couponId,
      'couponCode': couponCode,
      'discountAmount': discountAmount,
      'originalPrice': originalPrice,
    });
    final data = response.data as Map<String, dynamic>;
    return data['sessionUrl'] as String;
  }

  /// Retorna o código PIX "copia e cola" e metadados do QR.
  Future<Map<String, dynamic>> generatePixCode({
    required String requestId,
    required num amount,
  }) async {
    final response = await _client.functions.invoke('generatePixQrCode', body: {
      'requestId': requestId,
      'amount': amount,
    });
    return response.data as Map<String, dynamic>;
  }

  Future<CouponValidation> validateCoupon({
    required String couponCode,
    required num amount,
    String? professionId,
    String? providerId,
  }) async {
    final response = await _client.functions.invoke('validateCoupon', body: {
      'couponCode': couponCode,
      'amount': amount,
      'profession_id': professionId,
      'provider_id': providerId,
    });
    return CouponValidation.fromJson(response.data as Map<String, dynamic>);
  }
}
