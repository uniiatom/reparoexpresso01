import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta de `legacy/src/pages/ProviderEarnings.jsx`: saldo, histórico,
/// solicitação de saque via PIX, fundo de reserva e simulador de ganhos.
class EarningsScreen extends StatefulWidget {
  const EarningsScreen({super.key});

  @override
  State<EarningsScreen> createState() => _EarningsScreenState();
}

class _EarningsScreenState extends State<EarningsScreen> {
  final _repository = WalletRepository(ReparoSupabase.client);
  late Future<Wallet?> _walletFuture = _repository.findMine();
  late Future<List<WalletTransaction>> _transactionsFuture = _repository.listMyTransactions();
  final _currency = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
  final _dateFormat = DateFormat('dd/MM/yyyy HH:mm');
  final _financeRepository = FinanceRepository(ReparoSupabase.client);
  final _jobsController = TextEditingController(text: '20');
  final _ticketController = TextEditingController(text: '120');
  int _simulatorLevel = 1;

  @override
  void dispose() {
    _jobsController.dispose();
    _ticketController.dispose();
    super.dispose();
  }

  void _reload() {
    setState(() {
      _walletFuture = _repository.findMine();
      _transactionsFuture = _repository.listMyTransactions();
    });
  }

  Future<void> _openWithdrawDialog(Wallet wallet) async {
    final amountController = TextEditingController();
    final pixKeyController = TextEditingController();
    String pixKeyType = 'cpf';

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Solicitar saque'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Saldo disponível: ${_currency.format(wallet.balance)}'),
              const SizedBox(height: 12),
              TextField(
                controller: amountController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Valor (mínimo R\$ 50)'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: pixKeyType,
                decoration: const InputDecoration(labelText: 'Tipo de chave PIX'),
                items: const [
                  DropdownMenuItem(value: 'cpf', child: Text('CPF')),
                  DropdownMenuItem(value: 'email', child: Text('E-mail')),
                  DropdownMenuItem(value: 'phone', child: Text('Telefone')),
                  DropdownMenuItem(value: 'random', child: Text('Aleatória')),
                ],
                onChanged: (v) => setDialogState(() => pixKeyType = v ?? 'cpf'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: pixKeyController,
                decoration: const InputDecoration(labelText: 'Chave PIX'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Solicitar')),
          ],
        ),
      ),
    );

    if (confirmed != true) return;
    final amount = num.tryParse(amountController.text);
    if (amount == null || pixKeyController.text.trim().isEmpty) return;

    try {
      await _repository.requestWithdrawal(
        walletId: wallet.id,
        amount: amount,
        pixKey: pixKeyController.text.trim(),
        pixKeyType: pixKeyType,
      );
      _reload();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Saque solicitado!')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Não foi possível solicitar o saque.')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Ganhos')),
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
                      const SizedBox(height: 8),
                      Text('Total ganho: ${_currency.format(wallet?.totalEarned ?? 0)}'),
                      Text('Total sacado: ${_currency.format(wallet?.totalWithdrawn ?? 0)}'),
                      if (wallet != null) ...[
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => _openWithdrawDialog(wallet),
                          child: const Text('Solicitar saque'),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              FutureBuilder<ReserveFund?>(
                future: _financeRepository.findMyReserveFund(),
                builder: (context, reserveSnapshot) {
                  final reserve = reserveSnapshot.data;
                  if (reserve == null) return const SizedBox.shrink();
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Fundo de reserva', style: Theme.of(context).textTheme.titleSmall),
                          const SizedBox(height: 4),
                          Text('Disponível: ${_currency.format(reserve.availableAmount)}'),
                          Text('Retido (garantia): ${_currency.format(reserve.blockedAmount)}'),
                        ],
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 24),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Simulador de ganhos', style: Theme.of(context).textTheme.titleSmall),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _jobsController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(labelText: 'Serviços/mês'),
                              onChanged: (_) => setState(() {}),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextField(
                              controller: _ticketController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(labelText: 'Ticket médio (R\$)'),
                              onChanged: (_) => setState(() {}),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<int>(
                        initialValue: _simulatorLevel,
                        decoration: const InputDecoration(labelText: 'Nível'),
                        items: ProviderAchievement.levelNames.entries
                            .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                            .toList(),
                        onChanged: (v) => setState(() => _simulatorLevel = v ?? 1),
                      ),
                      const SizedBox(height: 8),
                      Builder(builder: (context) {
                        final jobs = int.tryParse(_jobsController.text) ?? 0;
                        final ticket = num.tryParse(_ticketController.text) ?? 0;
                        final bonusPercent = ProviderAchievement.cashbackPercentByLevel[_simulatorLevel] ?? 2;
                        final base = jobs * ticket;
                        final bonus = base * bonusPercent / 100;
                        return Text(
                          'Estimativa: ${_currency.format(base)} + ${_currency.format(bonus)} de bônus ($bonusPercent%) = ${_currency.format(base + bonus)}/mês',
                          style: Theme.of(context).textTheme.titleMedium,
                        );
                      }),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text('Histórico', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              FutureBuilder<List<WalletTransaction>>(
                future: _transactionsFuture,
                builder: (context, snapshot) {
                  final transactions = snapshot.data ?? const [];
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Padding(
                      padding: EdgeInsets.all(16),
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }
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
