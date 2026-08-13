import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta de `legacy/src/pages/ProviderMetricsPanel.jsx` /
/// `ProviderDashboard.jsx`: frequência de serviços por mês + tempo médio
/// de aceite/chegada, via `service_status_transitions` (trigger no banco,
/// ver /MIGRATION.md). Calculado no cliente a partir de `listMyJobs()`.
class MetricsScreen extends StatelessWidget {
  const MetricsScreen({super.key, required this.providerId});

  final String providerId;

  @override
  Widget build(BuildContext context) {
    final repository = ServiceRequestRepository(ReparoSupabase.client);
    final transitionRepository = ServiceStatusTransitionRepository(ReparoSupabase.client);
    final monthFormat = DateFormat('MM/yy');

    return Scaffold(
      appBar: AppBar(title: const Text('Minhas métricas')),
      body: FutureBuilder<List<ServiceRequest>>(
        future: repository.listMyJobs(providerId),
        builder: (context, jobsSnapshot) {
          if (jobsSnapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final jobs = jobsSnapshot.data ?? const [];
          final completed = jobs.where((j) => j.status == ServiceRequestStatus.concluido).toList();
          final cancelled = jobs.where((j) => j.status == ServiceRequestStatus.cancelado).length;
          final completionRate = jobs.isEmpty ? 0.0 : completed.length / jobs.length * 100;

          final byMonth = <String, int>{};
          for (final job in completed) {
            final key = monthFormat.format(job.createdAt);
            byMonth[key] = (byMonth[key] ?? 0) + 1;
          }
          final months = byMonth.keys.toList()..sort();

          return FutureBuilder<List<ServiceStatusTransition>>(
            future: transitionRepository.listForRequests(jobs.map((j) => j.id).toList()),
            builder: (context, transitionsSnapshot) {
              final transitions = transitionsSnapshot.data ?? const [];
              final byRequest = <String, List<ServiceStatusTransition>>{};
              for (final t in transitions) {
                (byRequest[t.serviceRequestId] ??= []).add(t);
              }
              final createdAtByRequest = {for (final j in jobs) j.id: j.createdAt};
              final avgAccept = averageStatusDuration(createdAtByRequest, byRequest, toStatus: 'aceito');
              final avgArrival = averageStatusDuration(
                createdAtByRequest,
                byRequest,
                toStatus: 'em_andamento',
                fromStatus: 'a_caminho',
              );

              return ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  Wrap(
                    spacing: 16,
                    runSpacing: 16,
                    children: [
                      _StatCard(label: 'Concluídos', value: '${completed.length}'),
                      _StatCard(label: 'Cancelados', value: '$cancelled'),
                      _StatCard(label: 'Taxa de conclusão', value: '${completionRate.toStringAsFixed(0)}%'),
                      _StatCard(
                        label: 'Tempo médio de aceite',
                        value: avgAccept == null ? '—' : formatAverageDuration(avgAccept),
                      ),
                      _StatCard(
                        label: 'Tempo médio de chegada',
                        value: avgArrival == null ? '—' : formatAverageDuration(avgArrival),
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),
                  Text('Serviços concluídos por mês', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 220,
                    child: months.isEmpty
                        ? const Center(child: Text('Sem dados ainda.'))
                        : BarChart(
                            BarChartData(
                              barGroups: [
                                for (var i = 0; i < months.length; i++)
                                  BarChartGroupData(
                                    x: i,
                                    barRods: [
                                      BarChartRodData(
                                        toY: byMonth[months[i]]!.toDouble(),
                                        color: AppColors.primary,
                                      ),
                                    ],
                                  ),
                              ],
                              titlesData: FlTitlesData(
                                bottomTitles: AxisTitles(
                                  sideTitles: SideTitles(
                                    showTitles: true,
                                    getTitlesWidget: (value, meta) {
                                      final index = value.toInt();
                                      if (index < 0 || index >= months.length) return const SizedBox.shrink();
                                      return Padding(
                                        padding: const EdgeInsets.only(top: 8),
                                        child: Text(months[index], style: const TextStyle(fontSize: 10)),
                                      );
                                    },
                                  ),
                                ),
                                leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: true)),
                                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                              ),
                              gridData: const FlGridData(show: true),
                              borderData: FlBorderData(show: false),
                            ),
                          ),
                  ),
                ],
              );
            },
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
      width: 160,
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
