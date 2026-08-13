/// Linha de `public.surcharge_rules` — regra de acréscimo por horário/dia
/// (plantão noturno, fim de semana etc.), porta de `getApplicableSurcharges`.
/// Leitura pra qualquer autenticado, escrita só admin. `professionIds`
/// restringe a regra a profissões do catálogo novo quando
/// `appliesToAllServices` é falso — substitui `serviceTypes` (slugs do
/// catálogo antigo, coluna mantida no banco mas não usada mais aqui, ver
/// MIGRATION.md seção 0.2/0.3).
class SurchargeRule {
  const SurchargeRule({
    required this.id,
    required this.name,
    this.ruleType,
    this.daysOfWeek = const [],
    this.timeStart,
    this.timeEnd,
    this.surchargePercent,
    this.appliesToAllServices = true,
    this.serviceTypes = const [],
    this.professionIds = const [],
    this.isActive = true,
    this.description,
  });

  final String id;
  final String name;
  final String? ruleType;
  final List<int> daysOfWeek;
  final String? timeStart;
  final String? timeEnd;
  final num? surchargePercent;
  final bool appliesToAllServices;
  final List<String> serviceTypes;
  final List<String> professionIds;
  final bool isActive;
  final String? description;

  factory SurchargeRule.fromJson(Map<String, dynamic> json) {
    return SurchargeRule(
      id: json['id'] as String,
      name: json['name'] as String,
      ruleType: json['rule_type'] as String?,
      daysOfWeek: (json['days_of_week'] as List?)?.cast<int>() ?? const [],
      timeStart: json['time_start'] as String?,
      timeEnd: json['time_end'] as String?,
      surchargePercent: json['surcharge_percent'] as num?,
      appliesToAllServices: json['applies_to_all_services'] as bool? ?? true,
      serviceTypes: (json['service_types'] as List?)?.cast<String>() ?? const [],
      professionIds: (json['profession_ids'] as List?)?.map((e) => e.toString()).toList() ?? const [],
      isActive: json['is_active'] as bool? ?? true,
      description: json['description'] as String?,
    );
  }
}

/// Uma regra aplicável agora, dentro do retorno de `getApplicableSurcharges`
/// — porta de `SurchargeAlert.jsx` (banner informativo na solicitação).
class AppliedSurcharge {
  const AppliedSurcharge({
    required this.id,
    required this.name,
    required this.surchargePercent,
    this.description,
  });

  final String id;
  final String name;
  final num surchargePercent;
  final String? description;

  factory AppliedSurcharge.fromJson(Map<String, dynamic> json) {
    return AppliedSurcharge(
      id: json['id'] as String,
      name: json['name'] as String,
      surchargePercent: json['surcharge_percent'] as num? ?? 0,
      description: json['description'] as String?,
    );
  }
}

/// Retorno completo de `getApplicableSurcharges`.
class SurchargeCheckResult {
  const SurchargeCheckResult({
    required this.applicable,
    required this.totalSurchargePercent,
    required this.referenceTime,
  });

  final List<AppliedSurcharge> applicable;
  final num totalSurchargePercent;
  final String? referenceTime;

  factory SurchargeCheckResult.fromJson(Map<String, dynamic> json) {
    return SurchargeCheckResult(
      applicable: (json['applicable'] as List? ?? const [])
          .map((e) => AppliedSurcharge.fromJson(e as Map<String, dynamic>))
          .toList(),
      totalSurchargePercent: json['total_surcharge_percent'] as num? ?? 0,
      referenceTime: json['reference_time'] as String?,
    );
  }
}
