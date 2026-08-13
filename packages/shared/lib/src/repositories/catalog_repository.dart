import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/catalog.dart';

/// Catálogo novo (`service_groups` → `professions` → `sub_services`),
/// substitui `OfferedServiceRepository`/`offered_services` como fonte de
/// verdade pro que o cliente pode pedir. Ver /MIGRATION.md.
class CatalogRepository {
  CatalogRepository(this._client);

  final SupabaseClient _client;

  Future<List<CatalogGroup>> listGroups() async {
    final data = await _client
        .from('service_groups')
        .select()
        .eq('is_active', true)
        .order('sort_order');
    return data.map(CatalogGroup.fromJson).toList();
  }

  Future<List<Profession>> listProfessions({String? groupId}) async {
    var query = _client.from('professions').select().eq('is_active', true);
    if (groupId != null) query = query.eq('group_id', groupId);
    final data = await query.order('sort_order');
    return data.map(Profession.fromJson).toList();
  }

  Future<List<SubService>> listSubServices(String professionId) async {
    final data = await _client
        .from('sub_services')
        .select()
        .eq('profession_id', professionId)
        .eq('is_active', true)
        .order('sort_order');
    return data.map(SubService.fromJson).toList();
  }

  // ── Gestão do catálogo (admin) — inclui itens inativos, sem filtro ────────

  Future<List<CatalogGroup>> listAllGroups() async {
    final data = await _client.from('service_groups').select().order('sort_order');
    return data.map(CatalogGroup.fromJson).toList();
  }

  Future<List<Profession>> listAllProfessions() async {
    final data = await _client.from('professions').select().order('sort_order');
    return data.map(Profession.fromJson).toList();
  }

  Future<List<SubService>> listAllSubServices() async {
    final data = await _client.from('sub_services').select().order('sort_order');
    return data.map(SubService.fromJson).toList();
  }

  Future<void> upsertGroup({
    String? id,
    required String slug,
    required String label,
    String? iconKey,
    int sortOrder = 0,
    bool isActive = true,
  }) async {
    await _client.from('service_groups').upsert({
      'id': ?id,
      'slug': slug,
      'label': label,
      'icon_key': ?iconKey,
      'sort_order': sortOrder,
      'is_active': isActive,
    });
  }

  Future<void> upsertProfession({
    String? id,
    required String groupId,
    required String slug,
    required String name,
    String? description,
    String? iconKey,
    int sortOrder = 0,
    bool isActive = true,
  }) async {
    await _client.from('professions').upsert({
      'id': ?id,
      'group_id': groupId,
      'slug': slug,
      'name': name,
      'description': ?description,
      'icon_key': ?iconKey,
      'sort_order': sortOrder,
      'is_active': isActive,
    });
  }

  Future<void> upsertSubService({
    String? id,
    required String professionId,
    required String slug,
    required String name,
    int sortOrder = 0,
    bool isActive = true,
  }) async {
    await _client.from('sub_services').upsert({
      'id': ?id,
      'profession_id': professionId,
      'slug': slug,
      'name': name,
      'sort_order': sortOrder,
      'is_active': isActive,
    });
  }

  /// Prestadores online dentro do raio que atendem a profissão (e,
  /// opcionalmente, o sub-serviço específico) — via RPC `find_nearby_providers`
  /// (Haversine + checagem de área de cobertura, tudo no banco).
  Future<List<NearbyProvider>> findNearbyProviders({
    required double latitude,
    required double longitude,
    required String professionId,
    String? subServiceId,
    double radiusKm = 15,
  }) async {
    final data = await _client.rpc('find_nearby_providers', params: {
      'p_lat': latitude,
      'p_lng': longitude,
      'p_profession_id': professionId,
      'p_sub_service_id': subServiceId,
      'p_radius_km': radiusKm,
    });
    return (data as List).cast<Map<String, dynamic>>().map(NearbyProvider.fromJson).toList();
  }
}
