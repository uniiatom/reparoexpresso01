import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta de `ClientHistoryPanel.jsx` + `ClientConsultaAdmin.jsx` +
/// `ClientBlacklist.jsx` numa tela só.
class ClientsTab extends StatefulWidget {
  const ClientsTab({super.key});

  @override
  State<ClientsTab> createState() => _ClientsTabState();
}

class _ClientsTabState extends State<ClientsTab> {
  final _repository = ClientRepository(ReparoSupabase.client);
  late Future<List<Client>> _future = _repository.searchAll();
  final _searchController = TextEditingController();

  void _search() => setState(() => _future = _repository.searchAll(query: _searchController.text));

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _toggleBlacklist(Client client) async {
    if (!client.isBlacklisted) {
      final reason = await showDialog<String>(
        context: context,
        builder: (context) {
          final controller = TextEditingController();
          return AlertDialog(
            title: const Text('Colocar na blacklist'),
            content: TextField(controller: controller, decoration: const InputDecoration(labelText: 'Motivo')),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
              FilledButton(
                onPressed: () => Navigator.pop(context, controller.text),
                child: const Text('Confirmar'),
              ),
            ],
          );
        },
      );
      if (reason == null) return;
      await _repository.setBlacklisted(client.id, true, reason: reason);
    } else {
      await _repository.setBlacklisted(client.id, false);
    }
    _search();
  }

  void _openHistory(Client client) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => _ClientHistorySheet(clientName: client.name, clientId: client.id),
    );
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
                  decoration: const InputDecoration(labelText: 'Buscar por nome, telefone ou CPF'),
                  onSubmitted: (_) => _search(),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(onPressed: _search, child: const Text('Buscar')),
            ],
          ),
        ),
        Expanded(
          child: FutureBuilder<List<Client>>(
            future: _future,
            builder: (context, snapshot) {
              final clients = snapshot.data ?? const [];
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              if (clients.isEmpty) return const Center(child: Text('Nenhum cliente encontrado.'));
              return ListView.builder(
                itemCount: clients.length,
                itemBuilder: (context, index) {
                  final client = clients[index];
                  return ListTile(
                    title: Text(client.name),
                    subtitle: Text([client.phone, client.cpf].nonNulls.join(' · ')),
                    trailing: FilterChip(
                      label: Text(client.isBlacklisted ? 'Blacklist' : 'Ativo'),
                      selected: client.isBlacklisted,
                      onSelected: (_) => _toggleBlacklist(client),
                    ),
                    onTap: () => _openHistory(client),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }
}

class _ClientHistorySheet extends StatelessWidget {
  const _ClientHistorySheet({required this.clientName, required this.clientId});

  final String clientName;
  final String clientId;

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd/MM/yyyy');
    return DraggableScrollableSheet(
      initialChildSize: 0.75,
      expand: false,
      builder: (context, scrollController) {
        return Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Histórico de $clientName', style: Theme.of(context).textTheme.titleLarge),
              const Divider(height: 24),
              Expanded(
                child: FutureBuilder<List<ServiceRequest>>(
                  future: ServiceRequestRepository(ReparoSupabase.client).listForClient(clientId),
                  builder: (context, snapshot) {
                    final orders = snapshot.data ?? const [];
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    if (orders.isEmpty) return const Text('Nenhum pedido ainda.');
                    return ListView.builder(
                      controller: scrollController,
                      itemCount: orders.length,
                      itemBuilder: (context, index) {
                        final order = orders[index];
                        return ListTile(
                          title: Text(order.serviceLabel),
                          subtitle: Text(dateFormat.format(order.createdAt)),
                          trailing: Chip(label: Text(order.status.label)),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
