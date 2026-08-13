/// Espelha `public.service_request_status` no Postgres e o glossário de
/// status do PRD (§19).
enum ServiceRequestStatus {
  aguardando,
  aceito,
  aCaminho,
  emAndamento,
  emEspera,
  concluido,
  cancelado,
  agendado;

  /// Valor exato armazenado no banco (snake_case, difere do nome Dart
  /// em alguns casos — ex.: `aCaminho` → `a_caminho`).
  String get dbValue => switch (this) {
        ServiceRequestStatus.aguardando => 'aguardando',
        ServiceRequestStatus.aceito => 'aceito',
        ServiceRequestStatus.aCaminho => 'a_caminho',
        ServiceRequestStatus.emAndamento => 'em_andamento',
        ServiceRequestStatus.emEspera => 'em_espera',
        ServiceRequestStatus.concluido => 'concluido',
        ServiceRequestStatus.cancelado => 'cancelado',
        ServiceRequestStatus.agendado => 'agendado',
      };

  /// Rótulo em português — PRD §9.5/§19.
  String get label => switch (this) {
        ServiceRequestStatus.aguardando => 'Procurando prestador...',
        ServiceRequestStatus.aceito => 'Prestador confirmado',
        ServiceRequestStatus.aCaminho => 'Prestador a caminho!',
        ServiceRequestStatus.emAndamento => 'Em execução',
        ServiceRequestStatus.emEspera => 'Em espera (peças)',
        ServiceRequestStatus.concluido => 'Concluído',
        ServiceRequestStatus.cancelado => 'Cancelado',
        ServiceRequestStatus.agendado => 'Agendado',
      };

  static ServiceRequestStatus fromDbValue(String value) {
    for (final status in ServiceRequestStatus.values) {
      if (status.dbValue == value) return status;
    }
    throw ArgumentError('Status de OS desconhecido: $value');
  }
}
