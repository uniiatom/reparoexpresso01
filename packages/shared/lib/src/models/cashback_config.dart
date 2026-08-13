/// Linha de `public.cashback_configs` — regras de cashback por nível/tipo
/// de dono (cliente/prestador). Leitura pra qualquer autenticado, escrita
/// só admin.
class CashbackConfig {
  const CashbackConfig({
    required this.id,
    this.configKey,
    this.nivel,
    this.ownerType,
    this.minJobs,
    this.maxJobs,
    this.minRating,
    this.bonusFixo,
    this.percentTake,
    this.isActive = true,
  });

  final String id;
  final String? configKey;
  final String? nivel;
  final String? ownerType;
  final int? minJobs;
  final int? maxJobs;
  final num? minRating;
  final num? bonusFixo;
  final num? percentTake;
  final bool isActive;

  factory CashbackConfig.fromJson(Map<String, dynamic> json) {
    return CashbackConfig(
      id: json['id'] as String,
      configKey: json['config_key'] as String?,
      nivel: json['nivel'] as String?,
      ownerType: json['owner_type'] as String?,
      minJobs: json['min_jobs'] as int?,
      maxJobs: json['max_jobs'] as int?,
      minRating: json['min_rating'] as num?,
      bonusFixo: json['bonus_fixo'] as num?,
      percentTake: json['percent_take'] as num?,
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}
