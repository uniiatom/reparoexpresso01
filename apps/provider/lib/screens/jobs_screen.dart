import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta simplificada de `ActiveJobCard.jsx`/histórico de jobs do
/// `ProviderApp.jsx`: lista as OS atribuídas ao prestador. Toque num job
/// abre `ActiveJobScreen` (mudança de status + chat).
class JobsScreen extends StatefulWidget {
  const JobsScreen({super.key});

  @override
  State<JobsScreen> createState() => _JobsScreenState();
}

class _JobsScreenState extends State<JobsScreen> {
  final _dateFormat = DateFormat('dd/MM/yyyy HH:mm');
  late final Future<List<ServiceRequest>> _jobsFuture = _loadJobs();

  Future<List<ServiceRequest>> _loadJobs() async {
    final myProvider = await ProviderRepository(ReparoSupabase.client).findMine();
    if (myProvider == null) return const [];
    return ServiceRequestRepository(ReparoSupabase.client).listMyJobs(myProvider.id);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Meus jobs')),
      body: FutureBuilder<List<ServiceRequest>>(
        future: _jobsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Erro: ${snapshot.error}'));
          }
          final jobs = snapshot.data ?? const [];
          if (jobs.isEmpty) {
            return const Center(child: Text('Nenhum job atribuído ainda.'));
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: jobs.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final job = jobs[index];
              return Card(
                child: ListTile(
                  onTap: () => context.push('/jobs/detail', extra: job),
                  title: Text(job.serviceLabel),
                  subtitle: Text(
                    '${[job.address, job.neighborhood, job.city].nonNulls.join(', ')}\n'
                    '${_dateFormat.format(job.createdAt.toLocal())}',
                  ),
                  isThreeLine: true,
                  trailing: Chip(label: Text(job.status.label)),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
