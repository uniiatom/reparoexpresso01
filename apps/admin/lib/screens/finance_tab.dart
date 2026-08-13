import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta de `InvoicesAdmin.jsx` + `BiweeklyClosingAdmin.jsx` +
/// `AdminReserveFundDashboard.jsx` + `ReembolsosRepasses.jsx` numa aba só,
/// com sub-abas. Configurações de pagamento (`PaymentSettings.jsx`) não
/// têm tabela de configuração no schema — ficou de fora.
class FinanceTab extends StatefulWidget {
  const FinanceTab({super.key});

  @override
  State<FinanceTab> createState() => _FinanceTabState();
}

class _FinanceTabState extends State<FinanceTab> with SingleTickerProviderStateMixin {
  late final TabController _tabController = TabController(length: 4, vsync: this);
  final _repository = FinanceRepository(ReparoSupabase.client);
  final _walletRepository = WalletRepository(ReparoSupabase.client);
  final _clientRepository = ClientRepository(ReparoSupabase.client);
  final _currency = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
  final _refundSearchController = TextEditingController();
  List<Client> _refundResults = const [];

  Future<void> _searchForRefund() async {
    final results = await _clientRepository.searchAll(query: _refundSearchController.text);
    setState(() => _refundResults = results);
  }

  Future<void> _issueRefund(Client client) async {
    final amountController = TextEditingController();
    final reasonController = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Reembolsar ${client.name}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: amountController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Valor (R\$)'),
            ),
            TextField(controller: reasonController, decoration: const InputDecoration(labelText: 'Motivo')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Reembolsar')),
        ],
      ),
    );
    final amount = num.tryParse(amountController.text);
    if (confirmed != true || amount == null || reasonController.text.trim().isEmpty) return;

    await _walletRepository.issueRefund(
      ownerId: client.userId ?? client.id,
      ownerType: 'client',
      ownerName: client.name,
      amount: amount,
      reason: reasonController.text.trim(),
    );
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Reembolso lançado na carteira!')));
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _refundSearchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Faturas'),
            Tab(text: 'Fechamentos'),
            Tab(text: 'Fundo de reserva'),
            Tab(text: 'Reembolsos'),
          ],
        ),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              FutureBuilder<List<Invoice>>(
                future: _repository.listInvoices(),
                builder: (context, snapshot) {
                  final invoices = snapshot.data ?? const [];
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (invoices.isEmpty) return const Center(child: Text('Nenhuma fatura.'));
                  return ListView.builder(
                    itemCount: invoices.length,
                    itemBuilder: (context, index) {
                      final invoice = invoices[index];
                      return ListTile(
                        title: Text(invoice.providerName ?? invoice.invoiceNumber ?? '—'),
                        subtitle: Text(invoice.invoiceNumber ?? ''),
                        trailing: Text('${_currency.format(invoice.amount ?? 0)} · ${invoice.status}'),
                      );
                    },
                  );
                },
              ),
              FutureBuilder<List<BiweeklyClosing>>(
                future: _repository.listBiweeklyClosings(),
                builder: (context, snapshot) {
                  final closings = snapshot.data ?? const [];
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (closings.isEmpty) return const Center(child: Text('Nenhum fechamento.'));
                  return ListView.builder(
                    itemCount: closings.length,
                    itemBuilder: (context, index) {
                      final closing = closings[index];
                      return ListTile(
                        title: Text(closing.providerName ?? '—'),
                        subtitle: Text('${closing.periodLabel ?? ''} · ${closing.totalServices} serviços'),
                        trailing: Text('${_currency.format(closing.netAmount)} · ${closing.status}'),
                        onTap: closing.status == 'pendente'
                            ? () async {
                                await _repository.markClosingPaid(closing.id);
                                setState(() {});
                              }
                            : null,
                      );
                    },
                  );
                },
              ),
              FutureBuilder<List<ReserveFund>>(
                future: _repository.listAllReserveFunds(),
                builder: (context, snapshot) {
                  final funds = snapshot.data ?? const [];
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (funds.isEmpty) return const Center(child: Text('Nenhum fundo de reserva.'));
                  return ListView.builder(
                    itemCount: funds.length,
                    itemBuilder: (context, index) {
                      final fund = funds[index];
                      return ListTile(
                        title: Text(fund.providerName ?? '—'),
                        subtitle: Text('Retido: ${_currency.format(fund.blockedAmount)}'),
                        trailing: Text(_currency.format(fund.availableAmount)),
                      );
                    },
                  );
                },
              ),
              Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _refundSearchController,
                            decoration: const InputDecoration(labelText: 'Buscar cliente pra reembolsar'),
                            onSubmitted: (_) => _searchForRefund(),
                          ),
                        ),
                        const SizedBox(width: 8),
                        FilledButton(onPressed: _searchForRefund, child: const Text('Buscar')),
                      ],
                    ),
                  ),
                  Expanded(
                    child: ListView.builder(
                      itemCount: _refundResults.length,
                      itemBuilder: (context, index) {
                        final client = _refundResults[index];
                        return ListTile(
                          title: Text(client.name),
                          subtitle: Text(client.phone),
                          trailing: FilledButton(
                            onPressed: () => _issueRefund(client),
                            child: const Text('Reembolsar'),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
