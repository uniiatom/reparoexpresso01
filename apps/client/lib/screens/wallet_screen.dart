import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta simplificada de `legacy/src/pages/Wallet.jsx` (lado cliente):
/// saldo, histórico e resgate de cashback disponível via PIX. Sem recarga
/// direta (isso acontece via `PaymentScreen` no fluxo de solicitação).
class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  final _walletRepository = WalletRepository(ReparoSupabase.client);
  final _cashbackRepository = CashbackRepository(ReparoSupabase.client);
  late final _walletFuture = _walletRepository.findMine();
  late final _transactionsFuture = _walletRepository.listMyTransactions();
  late Future<List<Cashback>> _cashbackFuture = _cashbackRepository.listMine();
  final _currency = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
  final _dateFormat = DateFormat('dd/MM/yyyy HH:mm');
  bool _redeeming = false;

  Future<void> _redeemAll(List<Cashback> available) async {
    setState(() => _redeeming = true);
    try {
      await _cashbackRepository.redeemToPix(available.map((c) => c.id).toList());
      setState(() => _cashbackFuture = _cashbackRepository.listMine());
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cashback resgatado!')));
      }
    } finally {
      if (mounted) setState(() => _redeeming = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Carteira')),
      body: FutureBuilder<Wallet?>(
        future: _walletFuture,
        builder: (context, walletSnapshot) {
          if (walletSnapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final wallet = walletSnapshot.data;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Saldo disponível'),
                      const SizedBox(height: 8),
                      Text(
                        _currency.format(wallet?.balance ?? 0),
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                      if ((wallet?.pendingBalance ?? 0) > 0) ...[
                        const SizedBox(height: 8),
                        Text('Pendente: ${_currency.format(wallet!.pendingBalance)}'),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              FutureBuilder<List<Cashback>>(
                future: _cashbackFuture,
                builder: (context, snapshot) {
                  final available =
                      (snapshot.data ?? const []).where((c) => c.status == 'disponivel').toList();
                  if (available.isEmpty) return const SizedBox.shrink();
                  final total = available.fold<num>(0, (sum, c) => sum + (c.cashbackAmount ?? 0));
                  return Card(
                    child: ListTile(
                      leading: const Icon(Icons.savings),
                      title: Text('Cashback disponível: ${_currency.format(total)}'),
                      trailing: FilledButton(
                        onPressed: _redeeming ? null : () => _redeemAll(available),
                        child: Text(_redeeming ? '...' : 'Resgatar'),
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 24),
              Text('Histórico', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              FutureBuilder<List<WalletTransaction>>(
                future: _transactionsFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Padding(
                      padding: EdgeInsets.all(16),
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }
                  final transactions = snapshot.data ?? const [];
                  if (transactions.isEmpty) {
                    return const Padding(
                      padding: EdgeInsets.all(16),
                      child: Text('Nenhuma movimentação ainda.'),
                    );
                  }
                  return Column(
                    children: transactions.map((t) {
                      return ListTile(
                        leading: Icon(t.amount >= 0 ? Icons.arrow_upward : Icons.arrow_downward),
                        title: Text(t.description ?? t.type),
                        subtitle: Text(_dateFormat.format(t.createdAt.toLocal())),
                        trailing: Text(_currency.format(t.amount)),
                      );
                    }).toList(),
                  );
                },
              ),
            ],
          );
        },
      ),
    );
  }
}
