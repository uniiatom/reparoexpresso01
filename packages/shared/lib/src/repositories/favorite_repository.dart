import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/favorite.dart';
import '../models/provider.dart';

/// Porta de `legacy/src/components/FavoritesList.jsx`/`FavoriteButton.jsx`.
class FavoriteRepository {
  FavoriteRepository(this._client);

  final SupabaseClient _client;

  Future<List<Favorite>> listMine() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return const [];
    final data = await _client
        .from('favorites')
        .select()
        .eq('client_id', uid)
        .order('created_at', ascending: false);
    return data.map(Favorite.fromJson).toList();
  }

  Future<bool> isFavorite(String providerId) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return false;
    final data = await _client
        .from('favorites')
        .select('id')
        .eq('client_id', uid)
        .eq('provider_id', providerId)
        .maybeSingle();
    return data != null;
  }

  Future<void> add(Provider provider) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) throw StateError('Não autenticado');
    await _client.from('favorites').insert({
      'client_id': uid,
      'provider_id': provider.id,
      'provider_name': provider.name,
      'provider_photo_url': ?provider.photoUrl,
      'provider_rating': provider.rating,
      'provider_city': ?provider.city,
      'provider_state': ?provider.state,
    });
  }

  Future<void> remove(String favoriteId) async {
    await _client.from('favorites').delete().eq('id', favoriteId);
  }
}
