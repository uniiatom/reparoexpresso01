import 'package:flutter/material.dart';
import 'package:reparo_shared/reparo_shared.dart';

const _ruleTypes = [
  ('time_range', 'Faixa de horário (ex.: plantão noturno)'),
  ('day_of_week', 'Dia(s) da semana'),
  ('holiday', 'Feriado'),
];

const _weekDays = [
  (0, 'Dom'),
  (1, 'Seg'),
  (2, 'Ter'),
  (3, 'Qua'),
  (4, 'Qui'),
  (5, 'Sex'),
  (6, 'Sáb'),
];

/// Gestão de `surcharge_rules` (acréscimo por horário/dia/feriado) — porta
/// de `SurchargeRulesAdmin.jsx`. Não existia nenhuma tela admin pra isso
/// antes (só o backend, `getApplicableSurcharges`, já corrigido pro
/// catálogo novo — ver /MIGRATION.md seção 0.3).
class SurchargeRulesTab extends StatefulWidget {
  const SurchargeRulesTab({super.key});

  @override
  State<SurchargeRulesTab> createState() => _SurchargeRulesTabState();
}

class _SurchargeRulesTabState extends State<SurchargeRulesTab> {
  final _repository = SurchargeRuleRepository(ReparoSupabase.client);
  final _catalog = CatalogRepository(ReparoSupabase.client);
  late Future<List<SurchargeRule>> _future = _repository.listAll();

  void _reload() => setState(() => _future = _repository.listAll());

  Future<void> _openDialog({SurchargeRule? existing}) async {
    final professions = await _catalog.listAllProfessions();
    if (!mounted) return;

    final nameController = TextEditingController(text: existing?.name ?? '');
    final percentController = TextEditingController(text: existing?.surchargePercent?.toString() ?? '');
    final descriptionController = TextEditingController(text: existing?.description ?? '');
    final timeStartController = TextEditingController(text: existing?.timeStart ?? '');
    final timeEndController = TextEditingController(text: existing?.timeEnd ?? '');
    var ruleType = existing?.ruleType ?? _ruleTypes.first.$1;
    var appliesToAll = existing?.appliesToAllServices ?? true;
    var isActive = existing?.isActive ?? true;
    final selectedDays = <int>{...?existing?.daysOfWeek};
    final selectedProfessionIds = <String>{...?existing?.professionIds};

    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(existing == null ? 'Nova regra de acréscimo' : 'Editar regra'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(controller: nameController, decoration: const InputDecoration(labelText: 'Nome')),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: ruleType,
                  decoration: const InputDecoration(labelText: 'Tipo de regra'),
                  items: _ruleTypes
                      .map((t) => DropdownMenuItem(value: t.$1, child: Text(t.$2)))
                      .toList(),
                  onChanged: (v) => setDialogState(() => ruleType = v ?? ruleType),
                ),
                if (ruleType == 'time_range') ...[
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: timeStartController,
                          decoration: const InputDecoration(labelText: 'Início (HH:MM)'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: timeEndController,
                          decoration: const InputDecoration(labelText: 'Fim (HH:MM)'),
                        ),
                      ),
                    ],
                  ),
                ],
                if (ruleType == 'time_range' || ruleType == 'day_of_week') ...[
                  const SizedBox(height: 12),
                  Text('Dias da semana (vazio = todos)', style: Theme.of(context).textTheme.bodySmall),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 6,
                    children: _weekDays.map((d) {
                      return FilterChip(
                        label: Text(d.$2),
                        selected: selectedDays.contains(d.$1),
                        onSelected: (selected) => setDialogState(() {
                          if (selected) {
                            selectedDays.add(d.$1);
                          } else {
                            selectedDays.remove(d.$1);
                          }
                        }),
                      );
                    }).toList(),
                  ),
                ],
                const SizedBox(height: 12),
                TextField(
                  controller: percentController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Percentual de acréscimo (%)'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: descriptionController,
                  decoration: const InputDecoration(labelText: 'Descrição (opcional)'),
                ),
                const SizedBox(height: 12),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Aplica pra todos os serviços'),
                  value: appliesToAll,
                  onChanged: (v) => setDialogState(() => appliesToAll = v),
                ),
                if (!appliesToAll) ...[
                  Text('Restringir a profissões', style: Theme.of(context).textTheme.bodySmall),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: professions.map((p) {
                      return FilterChip(
                        label: Text(p.name),
                        selected: selectedProfessionIds.contains(p.id),
                        onSelected: (selected) => setDialogState(() {
                          if (selected) {
                            selectedProfessionIds.add(p.id);
                          } else {
                            selectedProfessionIds.remove(p.id);
                          }
                        }),
                      );
                    }).toList(),
                  ),
                ],
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Ativa'),
                  value: isActive,
                  onChanged: (v) => setDialogState(() => isActive = v),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Salvar')),
          ],
        ),
      ),
    );

    if (saved == true && nameController.text.trim().isNotEmpty) {
      await _repository.upsert(
        id: existing?.id,
        name: nameController.text.trim(),
        ruleType: ruleType,
        daysOfWeek: selectedDays.toList(),
        timeStart: timeStartController.text.trim().isEmpty ? null : timeStartController.text.trim(),
        timeEnd: timeEndController.text.trim().isEmpty ? null : timeEndController.text.trim(),
        surchargePercent: num.tryParse(percentController.text) ?? 0,
        appliesToAllServices: appliesToAll,
        professionIds: appliesToAll ? const [] : selectedProfessionIds.toList(),
        description: descriptionController.text.trim().isEmpty ? null : descriptionController.text.trim(),
        isActive: isActive,
      );
      _reload();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton(onPressed: () => _openDialog(), child: const Icon(Icons.add)),
      body: FutureBuilder<List<SurchargeRule>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final rules = snapshot.data ?? const [];
          if (rules.isEmpty) {
            return const Center(child: Text('Nenhuma regra de acréscimo cadastrada.'));
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: rules.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final rule = rules[index];
              final scope = rule.appliesToAllServices
                  ? 'todos os serviços'
                  : '${rule.professionIds.length} profissão(ões)';
              return Card(
                child: ListTile(
                  title: Text('${rule.name} · +${rule.surchargePercent ?? 0}%'),
                  subtitle: Text('${rule.ruleType ?? '—'} · $scope${rule.isActive ? '' : ' · inativa'}'),
                  trailing: IconButton(
                    icon: const Icon(Icons.edit),
                    onPressed: () => _openDialog(existing: rule),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
