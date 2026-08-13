import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta de `legacy/src/pages/LoyaltyRewards.jsx`, incluindo o resgate de
/// pontos por recompensas fixas (via Edge Function `redeemLoyaltyPoints`).
class LoyaltyScreen extends StatefulWidget {
  const LoyaltyScreen({super.key});

  @override
  State<LoyaltyScreen> createState() => _LoyaltyScreenState();
}

class _LoyaltyScreenState extends State<LoyaltyScreen> {
  final _repository = LoyaltyRepository(ReparoSupabase.client);
  late Future<CustomerLoyalty?> _loyaltyFuture = _repository.findMine();
  late Future<List<LoyaltyTransaction>> _transactionsFuture = _repository.listMyTransactions();
  final _dateFormat = DateFormat('dd/MM/yyyy');
  bool _redeeming = false;

  void _reload() {
    setState(() {
      _loyaltyFuture = _repository.findMine();
      _transactionsFuture = _repository.listMyTransactions();
    });
  }

  Future<void> _redeem(int points, int discount) async {
    setState(() => _redeeming = true);
    try {
      await _repository.redeem(points);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Resgate de R\$ $discount de desconto confirmado!')),
      );
      _reload();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro ao resgatar: $e')),
      );
    } finally {
      if (mounted) setState(() => _redeeming = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Fidelidade')),
      body: FutureBuilder<CustomerLoyalty?>(
        future: _loyaltyFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final loyalty = snapshot.data;
          final available = loyalty?.availablePoints ?? 0;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Nível ${loyalty?.tier ?? 'bronze'}'.toUpperCase()),
                      const SizedBox(height: 8),
                      Text(
                        '$available pontos disponíveis',
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                      Text('${loyalty?.totalPoints ?? 0} pontos acumulados no total'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text('Resgatar recompensas', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              ...LoyaltyRepository.rewardTiers.entries.map((tier) {
                final canRedeem = available >= tier.key;
                return Card(
                  child: ListTile(
                    title: Text('R\$ ${tier.value} de desconto'),
                    subtitle: Text('${tier.key} pontos'),
                    trailing: canRedeem
                        ? FilledButton(
                            onPressed: _redeeming ? null : () => _redeem(tier.key, tier.value),
                            child: const Text('Resgatar'),
                          )
                        : Text(
                            'Faltam ${tier.key - available}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                  ),
                );
              }),
              const SizedBox(height: 24),
              Text('Histórico', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              FutureBuilder<List<LoyaltyTransaction>>(
                future: _transactionsFuture,
                builder: (context, txSnapshot) {
                  final transactions = txSnapshot.data ?? const [];
                  if (txSnapshot.connectionState == ConnectionState.waiting) {
                    return const Padding(
                      padding: EdgeInsets.all(16),
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }
                  if (transactions.isEmpty) {
                    return const Padding(
                      padding: EdgeInsets.all(16),
                      child: Text('Nenhuma movimentação de pontos ainda.'),
                    );
                  }
                  return Column(
                    children: transactions.map((t) {
                      return ListTile(
                        title: Text(t.description ?? t.type),
                        subtitle: Text(_dateFormat.format(t.createdAt.toLocal())),
                        trailing: Text('${t.points > 0 ? '+' : ''}${t.points}'),
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
