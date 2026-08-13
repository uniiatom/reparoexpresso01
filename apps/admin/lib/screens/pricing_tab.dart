import 'package:flutter/material.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta de `legacy/src/components/admin/ServicePricing.jsx` +
/// `ServicePricingByRegion.jsx` (o schema já tem `zone`/`city` na mesma
/// tabela, então é uma UI só). "Por categoria" e tabela de reboque por km
/// não têm coluna equivalente — ficam de fora.
class PricingTab extends StatefulWidget {
  const PricingTab({super.key});

  @override
  State<PricingTab> createState() => _PricingTabState();
}

class _PricingTabState extends State<PricingTab> {
  final _repository = ServicePricingRepository(ReparoSupabase.client);
  late Future<List<ServicePricing>> _future = _repository.listAll();

  void _reload() => setState(() => _future = _repository.listAll());

  Future<void> _openDialog({ServicePricing? existing}) async {
    final serviceTypeController = TextEditingController(text: existing?.serviceType ?? '');
    final minController = TextEditingController(text: existing?.priceMin?.toString() ?? '');
    final maxController = TextEditingController(text: existing?.priceMax?.toString() ?? '');
    final cityController = TextEditingController(text: existing?.city ?? '');
    final zoneController = TextEditingController(text: existing?.zone ?? '');
    final noteController = TextEditingController(text: existing?.note ?? '');

    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(existing == null ? 'Novo preço' : 'Editar preço'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: serviceTypeController,
                decoration: const InputDecoration(labelText: 'Tipo de serviço (slug)'),
              ),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: minController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Preço mínimo'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: maxController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Preço máximo'),
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: cityController,
                      decoration: const InputDecoration(labelText: 'Cidade (opcional — vazio = padrão)'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: zoneController,
                      decoration: const InputDecoration(labelText: 'Zona/região (opcional)'),
                    ),
                  ),
                ],
              ),
              TextField(controller: noteController, decoration: const InputDecoration(labelText: 'Observação')),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Salvar')),
        ],
      ),
    );

    if (saved == true && serviceTypeController.text.trim().isNotEmpty) {
      await _repository.upsert(
        id: existing?.id,
        serviceType: serviceTypeController.text.trim(),
        priceMin: num.tryParse(minController.text),
        priceMax: num.tryParse(maxController.text),
        city: cityController.text.trim().isEmpty ? null : cityController.text.trim(),
        zone: zoneController.text.trim().isEmpty ? null : zoneController.text.trim(),
        note: noteController.text.trim().isEmpty ? null : noteController.text.trim(),
      );
      _reload();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openDialog(),
        child: const Icon(Icons.add),
      ),
      body: FutureBuilder<List<ServicePricing>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final prices = snapshot.data ?? const [];
          if (prices.isEmpty) {
            return const Center(child: Text('Nenhum preço cadastrado.'));
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: prices.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final price = prices[index];
              final regionLabel = [price.city, price.zone].nonNulls.join(' · ');
              return Card(
                child: ListTile(
                  title: Text(price.serviceType),
                  subtitle: Text(
                    'R\$ ${price.priceMin ?? '—'} a R\$ ${price.priceMax ?? '—'}'
                    '${regionLabel.isNotEmpty ? ' · $regionLabel' : ' · padrão (todas as regiões)'}',
                  ),
                  trailing: IconButton(
                    icon: const Icon(Icons.edit),
                    onPressed: () => _openDialog(existing: price),
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
