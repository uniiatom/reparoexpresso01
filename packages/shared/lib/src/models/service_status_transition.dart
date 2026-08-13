/// Linha de `public.service_status_transitions` — histórico de mudança de
/// status de uma OS, gravado por trigger (`record_service_status_transition`)
/// pra cobrir tanto os `UPDATE`s diretos do app do prestador quanto os
/// feitos por Edge Functions. Staff-only.
class ServiceStatusTransition {
  const ServiceStatusTransition({
    required this.id,
    required this.serviceRequestId,
    required this.toStatus,
    required this.changedAt,
    this.fromStatus,
  });

  final String id;
  final String serviceRequestId;
  final String toStatus;
  final DateTime changedAt;
  final String? fromStatus;

  factory ServiceStatusTransition.fromJson(Map<String, dynamic> json) {
    return ServiceStatusTransition(
      id: json['id'] as String,
      serviceRequestId: json['service_request_id'] as String,
      toStatus: json['to_status'] as String,
      changedAt: DateTime.parse(json['changed_at'] as String),
      fromStatus: json['from_status'] as String?,
    );
  }
}

/// Tempo médio entre duas transições de status, por OS — ex.: aceite
/// (`aguardando`→`aceito`, usando [createdAtByRequestId] como marco
/// inicial quando [fromStatus] é nulo), chegada (`a_caminho`→`em_andamento`)
/// e execução (`em_andamento`→`concluido`). Usado tanto pelo admin
/// (`analytics_tab.dart`) quanto pelo prestador (`metrics_screen.dart`).
Duration? averageStatusDuration(
  Map<String, DateTime> createdAtByRequestId,
  Map<String, List<ServiceStatusTransition>> transitionsByRequestId, {
  required String toStatus,
  String? fromStatus,
}) {
  final samples = <Duration>[];
  for (final entry in createdAtByRequestId.entries) {
    final transitions = transitionsByRequestId[entry.key] ?? const [];
    ServiceStatusTransition? firstWhereStatus(String status) {
      for (final t in transitions) {
        if (t.toStatus == status) return t;
      }
      return null;
    }

    final target = firstWhereStatus(toStatus);
    if (target == null) continue;
    final start = fromStatus == null ? entry.value : firstWhereStatus(fromStatus)?.changedAt;
    if (start == null) continue;
    final delta = target.changedAt.difference(start);
    if (!delta.isNegative) samples.add(delta);
  }
  if (samples.isEmpty) return null;
  final totalMs = samples.fold<int>(0, (sum, d) => sum + d.inMilliseconds);
  return Duration(milliseconds: totalMs ~/ samples.length);
}

/// `"38 min"` ou `"1h 15min"`.
String formatAverageDuration(Duration d) {
  if (d.inMinutes < 60) return '${d.inMinutes} min';
  final hours = d.inMinutes ~/ 60;
  final minutes = d.inMinutes % 60;
  return '${hours}h ${minutes}min';
}
