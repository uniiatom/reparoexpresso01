/// Linha de `public.provider_level_history` — histórico de mudança de
/// nível de um prestador (subida/descida), porta de `ProviderAwards.jsx`.
class ProviderLevelHistory {
  const ProviderLevelHistory({
    required this.id,
    required this.providerId,
    required this.mudancaEm,
    this.nivelAnterior,
    this.nivelNovo,
    this.direcao,
    this.totalJobsNaMudanca,
    this.ratingNaMudanca,
  });

  final String id;
  final String providerId;
  final DateTime mudancaEm;
  final String? nivelAnterior;
  final String? nivelNovo;
  final String? direcao;
  final int? totalJobsNaMudanca;
  final num? ratingNaMudanca;

  factory ProviderLevelHistory.fromJson(Map<String, dynamic> json) {
    return ProviderLevelHistory(
      id: json['id'] as String,
      providerId: json['provider_id'] as String,
      mudancaEm: DateTime.parse(json['mudanca_em'] as String),
      nivelAnterior: json['nivel_anterior'] as String?,
      nivelNovo: json['nivel_novo'] as String?,
      direcao: json['direcao'] as String?,
      totalJobsNaMudanca: json['total_jobs_na_mudanca'] as int?,
      ratingNaMudanca: json['rating_na_mudanca'] as num?,
    );
  }
}
