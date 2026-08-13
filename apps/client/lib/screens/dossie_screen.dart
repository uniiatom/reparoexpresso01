import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta de `legacy/src/pages/ClienteDossie.jsx`: histórico completo +
/// analytics de gastos por categoria, calculado no cliente a partir de
/// `listMine()`.
class DossieScreen extends StatelessWidget {
  const DossieScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final repository = ServiceRequestRepository(ReparoSupabase.client);
    final currency = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');

    return Scaffold(
      appBar: AppBar(title: const Text('Meu histórico')),
      body: FutureBuilder<List<ServiceRequest>>(
        future: repository.listMine(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final orders = snapshot.data ?? const [];
          final completed = orders.where((o) => o.status == ServiceRequestStatus.concluido).toList();
          final totalSpent = completed.fold<num>(0, (sum, o) => sum + (o.finalPrice ?? o.estimatedPrice ?? 0));

          final byType = <String, num>{};
          for (final order in completed) {
            byType[order.serviceLabel] =
                (byType[order.serviceLabel] ?? 0) + (order.finalPrice ?? order.estimatedPrice ?? 0);
          }
          final sortedTypes = byType.entries.toList()..sort((a, b) => b.value.compareTo(a.value));

          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Wrap(
                spacing: 16,
                runSpacing: 16,
                children: [
                  _StatCard(label: 'Total gasto', value: currency.format(totalSpent)),
                  _StatCard(label: 'Serviços concluídos', value: '${completed.length}'),
                  _StatCard(label: 'Total de pedidos', value: '${orders.length}'),
                ],
              ),
              const SizedBox(height: 32),
              Text('Gastos por tipo de serviço', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              ...sortedTypes.map(
                (entry) => ListTile(
                  title: Text(entry.key),
                  trailing: Text(currency.format(entry.value)),
                ),
              ),
              if (sortedTypes.isEmpty) const Text('Nenhum serviço concluído ainda.'),
            ],
          );
        },
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 200,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: 4),
              Text(value, style: Theme.of(context).textTheme.titleLarge),
            ],
          ),
        ),
      ),
    );
  }
}
