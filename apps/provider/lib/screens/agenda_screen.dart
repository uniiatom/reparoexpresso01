import 'package:flutter/material.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta de `legacy/src/pages/ProviderSchedule.jsx`: disponibilidade por
/// dia da semana + bloqueios pontuais (`provider_unavailability`). Sem
/// calendário visual de agendamentos ainda.
class AgendaScreen extends StatefulWidget {
  const AgendaScreen({super.key, required this.providerId});

  final String providerId;

  @override
  State<AgendaScreen> createState() => _AgendaScreenState();
}

class _AgendaScreenState extends State<AgendaScreen> {
  final _repository = ProviderAvailabilityRepository(ReparoSupabase.client);
  final _unavailabilityRepository = ProviderUnavailabilityRepository(ReparoSupabase.client);
  late Future<List<ProviderAvailability>> _future = _repository.listFor(widget.providerId);
  late Future<List<ProviderUnavailability>> _unavailabilityFuture =
      _unavailabilityRepository.listFor(widget.providerId);

  void _reload() => setState(() => _future = _repository.listFor(widget.providerId));

  void _reloadUnavailability() => setState(
        () => _unavailabilityFuture = _unavailabilityRepository.listFor(widget.providerId),
      );

  Future<void> _openUnavailabilityDialog() async {
    var start = DateTime.now();
    var end = DateTime.now().add(const Duration(days: 1));
    final reasonController = TextEditingController();

    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Bloquear período'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Início'),
                subtitle: Text('${start.day}/${start.month}/${start.year}'),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: start,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (picked != null) setDialogState(() => start = picked);
                },
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Fim'),
                subtitle: Text('${end.day}/${end.month}/${end.year}'),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: end,
                    firstDate: start,
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (picked != null) setDialogState(() => end = picked);
                },
              ),
              TextField(
                controller: reasonController,
                decoration: const InputDecoration(labelText: 'Motivo (opcional)'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Salvar')),
          ],
        ),
      ),
    );

    if (saved == true) {
      await _unavailabilityRepository.create(
        providerId: widget.providerId,
        startDate: start,
        endDate: end,
        reason: reasonController.text.trim().isEmpty ? null : reasonController.text.trim(),
      );
      _reloadUnavailability();
    }
  }

  Future<void> _openDialog({ProviderAvailability? existing, int? dayOfWeek}) async {
    var day = existing?.dayOfWeek ?? dayOfWeek ?? 1;
    var start = existing?.startTime.substring(0, 5) ?? '08:00';
    var end = existing?.endTime.substring(0, 5) ?? '17:00';

    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Disponibilidade'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<int>(
                initialValue: day,
                decoration: const InputDecoration(labelText: 'Dia da semana'),
                items: List.generate(
                  7,
                  (i) => DropdownMenuItem(value: i, child: Text(ProviderAvailability.dayNames[i])),
                ),
                onChanged: (v) => setDialogState(() => day = v ?? day),
              ),
              TextFormField(
                initialValue: start,
                decoration: const InputDecoration(labelText: 'Início (HH:mm)'),
                onChanged: (v) => start = v,
              ),
              TextFormField(
                initialValue: end,
                decoration: const InputDecoration(labelText: 'Fim (HH:mm)'),
                onChanged: (v) => end = v,
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Salvar')),
          ],
        ),
      ),
    );

    if (saved == true) {
      await _repository.upsert(
        id: existing?.id,
        providerId: widget.providerId,
        dayOfWeek: day,
        startTime: '$start:00',
        endTime: '$end:00',
      );
      _reload();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Agenda')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openDialog(),
        child: const Icon(Icons.add),
      ),
      body: ListView(
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 4),
            child: Text('Disponibilidade semanal', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          FutureBuilder<List<ProviderAvailability>>(
            future: _future,
            builder: (context, snapshot) {
              final slots = snapshot.data ?? const [];
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Padding(
                  padding: EdgeInsets.all(16),
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              if (slots.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('Nenhuma disponibilidade cadastrada.'),
                );
              }
              return Column(
                children: slots.map((slot) {
                  return ListTile(
                    title: Text(ProviderAvailability.dayNames[slot.dayOfWeek]),
                    subtitle: Text('${slot.startTime.substring(0, 5)} às ${slot.endTime.substring(0, 5)}'),
                    trailing: IconButton(
                      icon: const Icon(Icons.delete_outline),
                      onPressed: () async {
                        await _repository.remove(slot.id);
                        _reload();
                      },
                    ),
                    onTap: () => _openDialog(existing: slot),
                  );
                }).toList(),
              );
            },
          ),
          const Divider(),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Bloqueios pontuais', style: TextStyle(fontWeight: FontWeight.bold)),
                TextButton.icon(
                  onPressed: _openUnavailabilityDialog,
                  icon: const Icon(Icons.event_busy),
                  label: const Text('Bloquear período'),
                ),
              ],
            ),
          ),
          FutureBuilder<List<ProviderUnavailability>>(
            future: _unavailabilityFuture,
            builder: (context, snapshot) {
              final blocks = snapshot.data ?? const [];
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Padding(
                  padding: EdgeInsets.all(16),
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              if (blocks.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('Nenhum bloqueio cadastrado.'),
                );
              }
              return Column(
                children: blocks.map((block) {
                  return ListTile(
                    title: Text(
                      '${block.startDate.day}/${block.startDate.month} até ${block.endDate.day}/${block.endDate.month}',
                    ),
                    subtitle: block.reason == null ? null : Text(block.reason!),
                    trailing: IconButton(
                      icon: const Icon(Icons.delete_outline),
                      onPressed: () async {
                        await _unavailabilityRepository.remove(block.id);
                        _reloadUnavailability();
                      },
                    ),
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}
