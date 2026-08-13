import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta de `legacy/src/components/admin/ActivityLog.jsx`. Com busca por
/// operador/ação e exportação CSV (copiável — sem download de arquivo em
/// Flutter Web ainda, mostra o texto pra copiar).
class ActivityLogTab extends StatefulWidget {
  const ActivityLogTab({super.key});

  @override
  State<ActivityLogTab> createState() => _ActivityLogTabState();
}

class _ActivityLogTabState extends State<ActivityLogTab> {
  final _repository = AdminActivityLogRepository(ReparoSupabase.client);
  final _dateFormat = DateFormat('dd/MM/yyyy HH:mm');
  late final Future<List<AdminActivityLog>> _future = _repository.listRecent();
  final _filterController = TextEditingController();

  @override
  void dispose() {
    _filterController.dispose();
    super.dispose();
  }

  void _exportCsv(List<AdminActivityLog> logs) {
    final buffer = StringBuffer('data,acao,operador,entidade\n');
    for (final log in logs) {
      buffer.writeln(
        '${_dateFormat.format(log.createdAt.toLocal())},${log.action},${log.actorName ?? ''},${log.entityLabel ?? ''}',
      );
    }
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('CSV (selecione e copie)'),
        content: SizedBox(
          width: 480,
          child: SelectableText(buffer.toString(), style: const TextStyle(fontFamily: 'monospace', fontSize: 12)),
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Fechar'))],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<AdminActivityLog>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        final allLogs = snapshot.data ?? const [];
        final filter = _filterController.text.trim().toLowerCase();
        final logs = filter.isEmpty
            ? allLogs
            : allLogs
                .where((l) =>
                    l.action.toLowerCase().contains(filter) ||
                    (l.actorName?.toLowerCase().contains(filter) ?? false))
                .toList();

        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _filterController,
                      decoration: const InputDecoration(labelText: 'Filtrar por ação ou operador'),
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton.icon(
                    onPressed: () => _exportCsv(logs),
                    icon: const Icon(Icons.download),
                    label: const Text('CSV'),
                  ),
                ],
              ),
            ),
            Expanded(
              child: logs.isEmpty
                  ? const Center(child: Text('Nenhuma atividade registrada ainda.'))
                  : ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: logs.length,
                      separatorBuilder: (_, _) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        final log = logs[index];
                        return ListTile(
                          title: Text(log.action),
                          subtitle: Text([log.actorName, log.entityLabel].nonNulls.join(' · ')),
                          trailing: Text(_dateFormat.format(log.createdAt.toLocal())),
                        );
                      },
                    ),
            ),
          ],
        );
      },
    );
  }
}
