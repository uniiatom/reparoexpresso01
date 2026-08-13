import 'package:flutter/material.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta de `legacy/src/components/ReferralCard.jsx`. O código de
/// indicação mora em `clients.referral_code`; sem editor de código
/// personalizado nem compartilhamento nativo (share sheet) ainda.
class ReferralScreen extends StatefulWidget {
  const ReferralScreen({super.key});

  @override
  State<ReferralScreen> createState() => _ReferralScreenState();
}

class _ReferralScreenState extends State<ReferralScreen> {
  final _clientRepository = ClientRepository(ReparoSupabase.client);
  final _referralRepository = ReferralRepository(ReparoSupabase.client);
  late Future<Client?> _clientFuture = _clientRepository.findMine();
  late final _referralsFuture = _referralRepository.listMine();

  Future<void> _generateCode(Client client) async {
    final code = client.id.replaceAll('-', '').substring(0, 8).toUpperCase();
    await _clientRepository.updateMine(clientId: client.id, referralCode: code);
    setState(() => _clientFuture = _clientRepository.findMine());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Indique e ganhe')),
      body: FutureBuilder<Client?>(
        future: _clientFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final client = snapshot.data;
          if (client == null) return const SizedBox.shrink();

          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const Text('Indique um amigo e ganhe R\$ 10 quando ele concluir o primeiro serviço.'),
              const SizedBox(height: 24),
              if (client.referralCode == null)
                ElevatedButton(
                  onPressed: () => _generateCode(client),
                  child: const Text('Gerar meu código'),
                )
              else
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      children: [
                        Text('Seu código', style: Theme.of(context).textTheme.bodyMedium),
                        const SizedBox(height: 8),
                        SelectableText(
                          client.referralCode!,
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 32),
              Text('Suas indicações', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              FutureBuilder<List<Referral>>(
                future: _referralsFuture,
                builder: (context, refSnapshot) {
                  final referrals = refSnapshot.data ?? const [];
                  if (refSnapshot.connectionState == ConnectionState.waiting) {
                    return const Padding(
                      padding: EdgeInsets.all(16),
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }
                  if (referrals.isEmpty) {
                    return const Text('Nenhuma indicação ainda.');
                  }
                  final converted = referrals.where((r) => r.rewardStatus == 'convertido').length;
                  return Text('${referrals.length} indicações · $converted convertidas');
                },
              ),
            ],
          );
        },
      ),
    );
  }
}
