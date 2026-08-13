import 'package:flutter/material.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta de `legacy/src/components/admin/CouponsAdmin.jsx`.
class CouponsTab extends StatefulWidget {
  const CouponsTab({super.key});

  @override
  State<CouponsTab> createState() => _CouponsTabState();
}

class _CouponsTabState extends State<CouponsTab> {
  final _repository = CouponRepository(ReparoSupabase.client);
  final _catalog = CatalogRepository(ReparoSupabase.client);
  late Future<List<Coupon>> _future = _repository.listAll();

  void _reload() => setState(() => _future = _repository.listAll());

  Future<void> _openCreateDialog() async {
    final codeController = TextEditingController();
    final valueController = TextEditingController();
    String discountType = 'percentage';
    final selectedProfessionIds = <String>{};
    final professions = await _catalog.listAllProfessions();
    if (!mounted) return;

    final created = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Novo cupom'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: codeController, decoration: const InputDecoration(labelText: 'Código')),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: discountType,
                  decoration: const InputDecoration(labelText: 'Tipo'),
                  items: const [
                    DropdownMenuItem(value: 'percentage', child: Text('Percentual')),
                    DropdownMenuItem(value: 'fixed', child: Text('Valor fixo')),
                  ],
                  onChanged: (v) => setDialogState(() => discountType = v ?? 'percentage'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: valueController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Valor'),
                ),
                const SizedBox(height: 16),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Restringir a profissões (vazio = vale pra qualquer serviço)',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
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
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Criar')),
          ],
        ),
      ),
    );

    if (created == true && codeController.text.trim().isNotEmpty) {
      await _repository.create(
        code: codeController.text.trim(),
        discountType: discountType,
        discountValue: num.tryParse(valueController.text) ?? 0,
        professionIds: selectedProfessionIds.toList(),
      );
      _reload();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        onPressed: _openCreateDialog,
        child: const Icon(Icons.add),
      ),
      body: FutureBuilder<List<Coupon>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final coupons = snapshot.data ?? const [];
          if (coupons.isEmpty) {
            return const Center(child: Text('Nenhum cupom cadastrado.'));
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: coupons.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final coupon = coupons[index];
              final valueLabel = coupon.discountType == 'percentage'
                  ? '${coupon.discountValue}%'
                  : 'R\$ ${coupon.discountValue}';
              return Card(
                child: ListTile(
                  title: Text(coupon.code),
                  subtitle: Text(
                    '$valueLabel · usado ${coupon.currentUses}x'
                    '${coupon.professionIds.isEmpty ? '' : ' · restrito a ${coupon.professionIds.length} profissão(ões)'}',
                  ),
                  trailing: Switch(
                    value: coupon.isActive,
                    onChanged: (v) async {
                      await _repository.setActive(coupon.id, v);
                      _reload();
                    },
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
