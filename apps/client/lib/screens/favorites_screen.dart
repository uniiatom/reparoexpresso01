import 'package:flutter/material.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta de `legacy/src/components/FavoritesList.jsx`.
class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  final _repository = FavoriteRepository(ReparoSupabase.client);
  late Future<List<Favorite>> _future = _repository.listMine();

  void _reload() => setState(() => _future = _repository.listMine());

  Future<void> _remove(Favorite favorite) async {
    await _repository.remove(favorite.id);
    _reload();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Favoritos')),
      body: FutureBuilder<List<Favorite>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final favorites = snapshot.data ?? const [];
          if (favorites.isEmpty) {
            return const Center(child: Text('Você ainda não tem prestadores favoritos.'));
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: favorites.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final favorite = favorites[index];
              return Card(
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundImage:
                        favorite.providerPhotoUrl != null ? NetworkImage(favorite.providerPhotoUrl!) : null,
                    child: favorite.providerPhotoUrl == null ? const Icon(Icons.person) : null,
                  ),
                  title: Text(favorite.providerName ?? 'Prestador'),
                  subtitle: Text(
                    [
                      if (favorite.providerRating != null) '★ ${favorite.providerRating!.toStringAsFixed(1)}',
                      favorite.providerCity,
                    ].nonNulls.join(' · '),
                  ),
                  trailing: IconButton(
                    icon: const Icon(Icons.favorite),
                    onPressed: () => _remove(favorite),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
