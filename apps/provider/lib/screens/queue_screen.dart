import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show SystemSound, SystemSoundType;
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart' as p;
import 'package:reparo_shared/reparo_shared.dart';

import 'provider_register_screen.dart';

/// Porta de `legacy/src/pages/ProviderApp.jsx` (fila de chamados). Alerta
/// de novo chamado usa `SystemSound.alert()` + modal fullscreen (porta de
/// `NewServiceFullscreenModal.jsx`) — a buzina de caminhão customizada do
/// legado (`useNewJobAlert.js`) precisaria de um asset de áudio que não
/// tenho; o som de sistema é o substituto disponível sem esse asset. Modal
/// de recusa na fila em si não existe (recusa existe em
/// `ActiveJobScreen`, depois de aceito) — ver checklist da Fase 4 em
/// /MIGRATION.md.
class QueueScreen extends StatefulWidget {
  const QueueScreen({super.key});

  @override
  State<QueueScreen> createState() => _QueueScreenState();
}

class _QueueScreenState extends State<QueueScreen> {
  late final _providerRepository = ProviderRepository(ReparoSupabase.client);
  late final _requestRepository = ServiceRequestRepository(ReparoSupabase.client);
  late Future<Provider?> _providerFuture = _providerRepository.findMine();
  String? _acceptingId;
  bool? _onlineOverride;
  final Set<String> _seenJobIds = {};
  bool _seenInitialized = false;

  bool _showingNewJobDialog = false;

  void _handleQueueUpdate(List<ServiceRequest> jobs, Provider provider) {
    final currentIds = jobs.map((j) => j.id).toSet();
    if (!_seenInitialized) {
      _seenJobIds.addAll(currentIds);
      _seenInitialized = true;
      return;
    }
    final newIds = currentIds.difference(_seenJobIds);
    if (newIds.isNotEmpty && !_showingNewJobDialog) {
      SystemSound.play(SystemSoundType.alert);
      final newJob = jobs.firstWhere((j) => j.id == newIds.first);
      _showNewJobDialog(newJob, provider);
    }
    _seenJobIds
      ..clear()
      ..addAll(currentIds);
  }

  Future<void> _showNewJobDialog(ServiceRequest job, Provider provider) async {
    _showingNewJobDialog = true;
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('🔔 Novo chamado!'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(job.serviceLabel, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 4),
            Text([job.neighborhood, job.city].nonNulls.join(' · ')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Ver na fila')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(context);
              await _accept(provider, job);
            },
            child: const Text('Aceitar'),
          ),
        ],
      ),
    );
    _showingNewJobDialog = false;
  }

  void _reloadProvider() => setState(() => _providerFuture = _providerRepository.findMine());

  Future<void> _toggleOnline(Provider provider) async {
    final next = !(_onlineOverride ?? provider.isOnline);
    setState(() => _onlineOverride = next);
    await _providerRepository.setOnline(provider.id, next);
  }

  Future<void> _accept(Provider provider, ServiceRequest job) async {
    setState(() => _acceptingId = job.id);
    try {
      await _requestRepository.acceptJob(requestId: job.id, providerId: provider.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Chamado aceito!')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Não foi possível aceitar. Tente novamente.')),
      );
    } finally {
      if (mounted) setState(() => _acceptingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Provider?>(
      future: _providerFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        final myProvider = snapshot.data;
        if (myProvider == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Área do prestador')),
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'Este usuário ainda não tem um cadastro de prestador.',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () async {
                        await Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (context) => ProviderRegisterScreen(onDone: () {
                              Navigator.of(context).pop();
                              _reloadProvider();
                            }),
                          ),
                        );
                      },
                      child: const Text('Cadastrar-se como prestador'),
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: () => context.read<AuthController>().signOut(),
                      child: const Text('Sair'),
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        if (!myProvider.isAvailableForJobs) {
          return Scaffold(
            appBar: AppBar(title: const Text('Área do prestador')),
            body: Center(
              child: Text(
                myProvider.isApproved
                    ? 'Seu cadastro está bloqueado/arquivado. Fale com o suporte.'
                    : 'Seu cadastro ainda está em análise pelo admin.',
                textAlign: TextAlign.center,
              ),
            ),
          );
        }

        final online = _onlineOverride ?? myProvider.isOnline;

        return Scaffold(
          appBar: AppBar(
            title: const Text('Fila de chamados'),
            actions: [
              Row(
                children: [
                  Text(online ? 'Online' : 'Offline'),
                  Switch(value: online, onChanged: (_) => _toggleOnline(myProvider)),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.work_history),
                tooltip: 'Meus jobs',
                onPressed: () => context.push('/jobs'),
              ),
              IconButton(
                icon: const Icon(Icons.dashboard),
                tooltip: 'Métricas',
                onPressed: () => context.push('/metrics', extra: myProvider.id),
              ),
              IconButton(
                icon: const Icon(Icons.account_balance_wallet),
                tooltip: 'Ganhos',
                onPressed: () => context.push('/earnings'),
              ),
              IconButton(
                icon: const Icon(Icons.person),
                tooltip: 'Perfil',
                onPressed: () => context.push('/profile'),
              ),
              IconButton(
                icon: const Icon(Icons.logout),
                tooltip: 'Sair',
                onPressed: () => context.read<AuthController>().signOut(),
              ),
            ],
          ),
          body: StreamBuilder<List<ServiceRequest>>(
            stream: _requestRepository.watchAvailableQueue(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return Center(child: Text('Erro: ${snapshot.error}'));
              }
              final jobs = snapshot.data ?? const [];
              WidgetsBinding.instance.addPostFrameCallback((_) => _handleQueueUpdate(jobs, myProvider));
              if (jobs.isEmpty) {
                return const Center(child: Text('Nenhum chamado disponível no momento.'));
              }
              return ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: jobs.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final job = jobs[index];
                  final accepting = _acceptingId == job.id;
                  return Card(
                    child: ListTile(
                      title: Text(job.serviceLabel),
                      subtitle: Text([job.neighborhood, job.city].nonNulls.join(' · ')),
                      trailing: FilledButton(
                        onPressed: accepting ? null : () => _accept(myProvider, job),
                        child: Text(accepting ? 'Aceitando…' : 'Aceitar'),
                      ),
                    ),
                  );
                },
              );
            },
          ),
        );
      },
    );
  }
}
