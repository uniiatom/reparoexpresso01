import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:reparo_shared/reparo_shared.dart';

const _patterns = ['semanal', 'quinzenal', 'mensal'];

/// Porta de `legacy/src/components/RecurringServiceForm/List.jsx`. A
/// criação da OS de cada ocorrência é feita pelo cron
/// `processRecurringServices` (já ativo no Supabase) — aqui só
/// criamos/cancelamos a recorrência.
class RecurringServicesScreen extends StatefulWidget {
  const RecurringServicesScreen({super.key});

  @override
  State<RecurringServicesScreen> createState() => _RecurringServicesScreenState();
}

class _RecurringServicesScreenState extends State<RecurringServicesScreen> {
  final _repository = RecurringServiceRepository(ReparoSupabase.client);
  final _catalog = CatalogRepository(ReparoSupabase.client);
  late Future<List<RecurringServiceSchedule>> _future = _repository.listMine();
  final _dateFormat = DateFormat('dd/MM/yyyy');

  void _reload() => setState(() => _future = _repository.listMine());

  Future<void> _openCreateDialog() async {
    final professions = await _catalog.listProfessions();
    if (!mounted || professions.isEmpty) return;

    Profession? profession = professions.first;
    List<SubService> subServices = await _catalog.listSubServices(profession.id);
    SubService? subService;
    var pattern = _patterns.first;

    if (!mounted) return;
    final created = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Novo serviço recorrente'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<Profession>(
                initialValue: profession,
                decoration: const InputDecoration(labelText: 'Tipo de serviço'),
                items: professions.map((p) => DropdownMenuItem(value: p, child: Text(p.name))).toList(),
                onChanged: (p) async {
                  if (p == null) return;
                  final subs = await _catalog.listSubServices(p.id);
                  setDialogState(() {
                    profession = p;
                    subServices = subs;
                    subService = null;
                  });
                },
              ),
              if (subServices.isNotEmpty)
                DropdownButtonFormField<SubService?>(
                  initialValue: subService,
                  decoration: const InputDecoration(labelText: 'Sub-serviço (opcional)'),
                  items: [
                    const DropdownMenuItem<SubService?>(value: null, child: Text('—')),
                    ...subServices.map((s) => DropdownMenuItem(value: s, child: Text(s.name))),
                  ],
                  onChanged: (s) => setDialogState(() => subService = s),
                ),
              DropdownButtonFormField<String>(
                initialValue: pattern,
                decoration: const InputDecoration(labelText: 'Frequência'),
                items: _patterns.map((p) => DropdownMenuItem(value: p, child: Text(p))).toList(),
                onChanged: (v) => setDialogState(() => pattern = v ?? pattern),
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

    if (created == true && profession != null) {
      await _repository.create(
        professionId: profession!.id,
        subServiceId: subService?.id,
        recurrencePattern: pattern,
        startDate: DateTime.now().add(const Duration(days: 7)),
      );
      _reload();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Serviços recorrentes')),
      floatingActionButton: FloatingActionButton(onPressed: _openCreateDialog, child: const Icon(Icons.add)),
      body: FutureBuilder<List<RecurringServiceSchedule>>(
        future: _future,
        builder: (context, snapshot) {
          final schedules = snapshot.data ?? const [];
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (schedules.isEmpty) {
            return const Center(child: Text('Nenhum serviço recorrente cadastrado.'));
          }
          return ListView.builder(
            itemCount: schedules.length,
            itemBuilder: (context, index) {
              final s = schedules[index];
              return ListTile(
                title: Text(s.serviceLabel),
                subtitle: Text(
                  '${s.recurrencePattern ?? '—'} · próximo: ${s.nextServiceDate != null ? _dateFormat.format(s.nextServiceDate!) : '—'}',
                ),
                trailing: s.isActive
                    ? IconButton(
                        icon: const Icon(Icons.cancel),
                        onPressed: () async {
                          await _repository.cancel(s.id);
                          _reload();
                        },
                      )
                    : const Text('Cancelado'),
              );
            },
          );
        },
      ),
    );
  }
}
