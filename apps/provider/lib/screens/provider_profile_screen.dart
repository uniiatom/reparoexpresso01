import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart' as p;
import 'package:qr_flutter/qr_flutter.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta de `legacy/src/pages/ProviderProfile.jsx`: dados básicos +
/// métricas + nível/gamificação + QR code de review do Google + navegação
/// pra documentos/agenda/suporte. Sem edição de perfil, upload de fotos ou
/// área de atuação (mapa) ainda — ver Fase 4 em /MIGRATION.md.
class ProviderProfileScreen extends StatelessWidget {
  const ProviderProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Meu perfil')),
      body: FutureBuilder<Provider?>(
        future: ProviderRepository(ReparoSupabase.client).findMine(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final provider = snapshot.data;
          if (provider == null) return const SizedBox.shrink();
          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              CircleAvatar(
                radius: 40,
                backgroundImage: provider.photoUrl != null ? NetworkImage(provider.photoUrl!) : null,
                child: provider.photoUrl == null ? const Icon(Icons.person, size: 40) : null,
              ),
              const SizedBox(height: 16),
              Text(provider.name, style: Theme.of(context).textTheme.headlineSmall),
              if (provider.email != null) Text(provider.email!),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _Metric(label: 'Nota', value: '★ ${provider.rating.toStringAsFixed(1)}'),
                  _Metric(label: 'Avaliações', value: '${provider.totalReviews}'),
                ],
              ),
              FutureBuilder<List<Profession>>(
                future: ProviderRepository(ReparoSupabase.client).listMyProfessions(provider.id),
                builder: (context, professionsSnapshot) {
                  final professions = professionsSnapshot.data ?? const [];
                  if (professions.isEmpty) return const SizedBox.shrink();
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 24),
                      Text('Profissões', style: Theme.of(context).textTheme.titleSmall),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        children: professions.map((profession) => Chip(label: Text(profession.name))).toList(),
                      ),
                    ],
                  );
                },
              ),
              const SizedBox(height: 24),
              FutureBuilder<ProviderAchievement?>(
                future: ProviderAchievementRepository(ReparoSupabase.client).findByProviderId(provider.id),
                builder: (context, achievementSnapshot) {
                  final achievement = achievementSnapshot.data;
                  if (achievement == null) return const SizedBox.shrink();
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Nível ${achievement.levelName}', style: Theme.of(context).textTheme.titleMedium),
                          Text(
                            'Bônus de cashback: ${ProviderAchievement.cashbackPercentByLevel[achievement.level] ?? 2}% por serviço',
                          ),
                          if (achievement.achievementsUnlocked.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              children: achievement.achievementsUnlocked
                                  .map((a) => Chip(avatar: const Icon(Icons.emoji_events, size: 16), label: Text(a)))
                                  .toList(),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                },
              ),
              const Divider(height: 48),
              ListTile(
                leading: const Icon(Icons.badge),
                title: const Text('CNPJ e documentos'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/documents', extra: provider.id),
              ),
              ListTile(
                leading: const Icon(Icons.calendar_month),
                title: const Text('Agenda de disponibilidade'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/agenda', extra: provider.id),
              ),
              ListTile(
                leading: const Icon(Icons.support_agent),
                title: const Text('Abrir chamado de suporte'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/support/new', extra: provider.id),
              ),
              const SizedBox(height: 24),
              Text('QR Code para avaliação no Google', style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 8),
              Center(
                child: QrImageView(
                  data: 'https://search.google.com/local/writereview?placeid=SEU_PLACE_ID',
                  size: 160,
                  backgroundColor: Colors.white,
                ),
              ),
              const Divider(height: 48),
              TextButton(
                onPressed: () => context.read<AuthController>().signOut(),
                child: const Text('Sair'),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: Theme.of(context).textTheme.titleLarge),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}
