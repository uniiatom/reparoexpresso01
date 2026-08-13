import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/coupon.dart';

/// Porta de `legacy/src/components/admin/CouponsAdmin.jsx`. RLS
/// (`coupons` está em `read_all_tables` no schema): leitura pra qualquer
/// autenticado, escrita só admin.
class CouponRepository {
  CouponRepository(this._client);

  final SupabaseClient _client;

  Future<List<Coupon>> listAll() async {
    final data = await _client.from('coupons').select().order('created_at', ascending: false);
    return data.map(Coupon.fromJson).toList();
  }

  Future<void> create({
    required String code,
    required String discountType,
    required num discountValue,
    String? description,
    int? maxUses,
    List<String> professionIds = const [],
  }) async {
    await _client.from('coupons').insert({
      'code': code.toUpperCase(),
      'discount_type': discountType,
      'discount_value': discountValue,
      'description': ?description,
      'max_uses': ?maxUses,
      'profession_ids': professionIds,
    });
  }

  Future<void> setActive(String couponId, bool isActive) async {
    await _client.from('coupons').update({'is_active': isActive}).eq('id', couponId);
  }
}
