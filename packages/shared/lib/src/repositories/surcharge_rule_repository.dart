import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/surcharge_rule.dart';

/// Gestão admin de `surcharge_rules` — regras de acréscimo (plantão
/// noturno, fim de semana, feriado). RLS libera SELECT pra qualquer
/// autenticado, escrita só admin. Complementa
/// `ServicePartRepository.listActiveSurchargeRules()` (leitura do lado
/// prestador), que continua existindo pra não duplicar.
class SurchargeRuleRepository {
  SurchargeRuleRepository(this._client);

  final SupabaseClient _client;

  Future<List<SurchargeRule>> listAll() async {
    final data = await _client.from('surcharge_rules').select().order('created_at', ascending: false);
    return data.map(SurchargeRule.fromJson).toList();
  }

  Future<void> upsert({
    String? id,
    required String name,
    required String ruleType,
    List<int> daysOfWeek = const [],
    String? timeStart,
    String? timeEnd,
    required num surchargePercent,
    bool appliesToAllServices = true,
    List<String> professionIds = const [],
    String? description,
    bool isActive = true,
  }) async {
    await _client.from('surcharge_rules').upsert({
      'id': ?id,
      'name': name,
      'rule_type': ruleType,
      'days_of_week': daysOfWeek,
      'time_start': ?timeStart,
      'time_end': ?timeEnd,
      'surcharge_percent': surchargePercent,
      'applies_to_all_services': appliesToAllServices,
      'profession_ids': professionIds,
      'description': ?description,
      'is_active': isActive,
    });
  }

  Future<void> setActive(String id, bool isActive) async {
    await _client.from('surcharge_rules').update({'is_active': isActive}).eq('id', id);
  }

  /// Regras de acréscimo válidas agora pra uma profissão — porta de
  /// `SurchargeAlert.jsx`. Só informativo (o legado também não aplicava o
  /// desconto no preço no client, era calculado em outro lugar).
  Future<SurchargeCheckResult> checkApplicable({String? professionId}) async {
    final response = await _client.functions.invoke('getApplicableSurcharges', body: {
      'profession_id': professionId,
    });
    return SurchargeCheckResult.fromJson(response.data as Map<String, dynamic>);
  }
}
