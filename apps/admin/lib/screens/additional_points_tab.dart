import 'package:flutter/material.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta de `legacy/src/components/admin/AdditionalPointsAdmin.jsx`.
class AdditionalPointsTab extends StatefulWidget {
  const AdditionalPointsTab({super.key});

  @override
  State<AdditionalPointsTab> createState() => _AdditionalPointsTabState();
}

class _AdditionalPointsTabState extends State<AdditionalPointsTab> {
  final _clientRepository = ClientRepository(ReparoSupabase.client);
  final _loyaltyRepository = LoyaltyRepository(ReparoSupabase.client);
  final _searchController = TextEditingController();
  List<Client> _results = const [];
  bool _searching = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    setState(() => _searching = true);
    try {
      _results = await _clientRepository.searchAll(query: _searchController.text);
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  Future<void> _grant(Client client) async {
    final pointsController = TextEditingController();
    final reasonController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Pontos para ${client.name}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: pointsController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Pontos'),
            ),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(labelText: 'Justificativa'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Atribuir')),
        ],
      ),
    );

    final points = int.tryParse(pointsController.text);
    if (confirmed != true || points == null || reasonController.text.trim().isEmpty) return;

    await _loyaltyRepository.grantPoints(
      clientId: client.userId ?? client.id,
      points: points,
      reason: reasonController.text.trim(),
    );
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pontos atribuídos!')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  decoration: const InputDecoration(labelText: 'Buscar cliente'),
                  onSubmitted: (_) => _search(),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(onPressed: _searching ? null : _search, child: const Text('Buscar')),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            itemCount: _results.length,
            itemBuilder: (context, index) {
              final client = _results[index];
              return ListTile(
                title: Text(client.name),
                subtitle: Text(client.phone),
                trailing: FilledButton(onPressed: () => _grant(client), child: const Text('+ Pontos')),
              );
            },
          ),
        ),
      ],
    );
  }
}
