import 'package:flutter/material.dart';
import 'package:reparo_shared/reparo_shared.dart';

const _intervals = [
  (30, '1 mês'),
  (90, '3 meses'),
  (180, '6 meses'),
  (365, '1 ano'),
];

/// Porta de `legacy/src/components/PreventiveServiceAlarmForm/List.jsx`.
class PreventiveRemindersScreen extends StatefulWidget {
  const PreventiveRemindersScreen({super.key});

  @override
  State<PreventiveRemindersScreen> createState() => _PreventiveRemindersScreenState();
}

class _PreventiveRemindersScreenState extends State<PreventiveRemindersScreen> {
  final _repository = PreventiveServiceReminderRepository(ReparoSupabase.client);
  late Future<List<PreventiveServiceReminder>> _future = _repository.listMine();

  void _reload() => setState(() => _future = _repository.listMine());

  Future<void> _openCreateDialog() async {
    final serviceTypeController = TextEditingController();
    var interval = _intervals.first;

    final created = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Novo lembrete'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: serviceTypeController,
                decoration: const InputDecoration(labelText: 'Tipo de serviço (ex: ar_condicionado)'),
              ),
              DropdownButtonFormField<(int, String)>(
                initialValue: interval,
                decoration: const InputDecoration(labelText: 'Repetir a cada'),
                items: _intervals.map((i) => DropdownMenuItem(value: i, child: Text(i.$2))).toList(),
                onChanged: (v) => setDialogState(() => interval = v ?? interval),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Criar')),
          ],
        ),
      ),
    );

    if (created == true && serviceTypeController.text.trim().isNotEmpty) {
      await _repository.create(
        serviceType: serviceTypeController.text.trim(),
        reminderIntervalDays: interval.$1,
        reminderIntervalLabel: interval.$2,
      );
      _reload();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Lembretes de manutenção')),
      floatingActionButton: FloatingActionButton(onPressed: _openCreateDialog, child: const Icon(Icons.add)),
      body: FutureBuilder<List<PreventiveServiceReminder>>(
        future: _future,
        builder: (context, snapshot) {
          final reminders = snapshot.data ?? const [];
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (reminders.isEmpty) {
            return const Center(child: Text('Nenhum lembrete cadastrado.'));
          }
          return ListView.builder(
            itemCount: reminders.length,
            itemBuilder: (context, index) {
              final r = reminders[index];
              return SwitchListTile(
                title: Text(r.serviceType),
                subtitle: Text('A cada ${r.reminderIntervalLabel ?? '—'}'),
                value: r.isActive,
                onChanged: (v) async {
                  await _repository.setActive(r.id, v);
                  _reload();
                },
              );
            },
          );
        },
      ),
    );
  }
}
