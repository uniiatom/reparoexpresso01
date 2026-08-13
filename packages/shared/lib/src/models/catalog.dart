/// Linha de `public.service_groups` — topo da hierarquia do catálogo novo
/// (`service_groups` → `professions` → `sub_services`), que substitui
/// `offered_services` como fonte de verdade pro que o cliente pode pedir.
/// Ver /MIGRATION.md — schema construído fora deste repositório, descoberto
/// numa sessão de adaptação (2026-08-12).
class CatalogGroup {
  const CatalogGroup({
    required this.id,
    required this.slug,
    required this.label,
    this.iconKey,
    this.sortOrder = 0,
    this.isActive = true,
  });

  final String id;
  final String slug;
  final String label;
  final String? iconKey;
  final int sortOrder;
  final bool isActive;

  factory CatalogGroup.fromJson(Map<String, dynamic> json) {
    return CatalogGroup(
      id: json['id'] as String,
      slug: json['slug'] as String,
      label: json['label'] as String,
      iconKey: json['icon_key'] as String?,
      sortOrder: json['sort_order'] as int? ?? 0,
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}

/// Linha de `public.professions` — ex.: "Encanador", "Eletricista".
class Profession {
  const Profession({
    required this.id,
    required this.groupId,
    required this.slug,
    required this.name,
    this.description,
    this.iconKey,
    this.sortOrder = 0,
    this.isActive = true,
  });

  final String id;
  final String groupId;
  final String slug;
  final String name;
  final String? description;
  final String? iconKey;
  final int sortOrder;
  final bool isActive;

  factory Profession.fromJson(Map<String, dynamic> json) {
    return Profession(
      id: json['id'] as String,
      groupId: json['group_id'] as String,
      slug: json['slug'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      iconKey: json['icon_key'] as String?,
      sortOrder: json['sort_order'] as int? ?? 0,
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}

/// Linha de `public.sub_services` — serviço específico dentro de uma
/// profissão (ex.: "Desentupimento" dentro de "Encanador").
/// `formEnabled` indica se existe formulário dinâmico associado
/// (`service_request_form_fields.sub_service_id`) — ainda não portado.
class SubService {
  const SubService({
    required this.id,
    required this.professionId,
    required this.slug,
    required this.name,
    this.sortOrder = 0,
    this.isActive = true,
    this.formEnabled = false,
  });

  final String id;
  final String professionId;
  final String slug;
  final String name;
  final int sortOrder;
  final bool isActive;
  final bool formEnabled;

  factory SubService.fromJson(Map<String, dynamic> json) {
    return SubService(
      id: json['id'] as String,
      professionId: json['profession_id'] as String,
      slug: json['slug'] as String,
      name: json['name'] as String,
      sortOrder: json['sort_order'] as int? ?? 0,
      isActive: json['is_active'] as bool? ?? true,
      formEnabled: json['form_enabled'] as bool? ?? false,
    );
  }
}

/// Resultado de `find_nearby_providers` (RPC) — prestador dentro do raio
/// que atende a profissão (e opcionalmente o sub-serviço) pedidos.
class NearbyProvider {
  const NearbyProvider({
    required this.id,
    required this.name,
    required this.distanceKm,
    this.photoUrl,
    this.rating,
    this.totalReviews,
    this.isOnline = false,
  });

  final String id;
  final String name;
  final num distanceKm;
  final String? photoUrl;
  final num? rating;
  final int? totalReviews;
  final bool isOnline;

  factory NearbyProvider.fromJson(Map<String, dynamic> json) {
    return NearbyProvider(
      id: json['id'] as String,
      name: json['name'] as String,
      distanceKm: json['distance_km'] as num? ?? 0,
      photoUrl: json['photo_url'] as String?,
      rating: json['rating'] as num?,
      totalReviews: json['total_reviews'] as int?,
      isOnline: json['is_online'] as bool? ?? false,
    );
  }
}
