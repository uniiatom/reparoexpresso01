import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta de `legacy/src/pages/DashboardAdmin.jsx` (aba "Visão Geral") +
/// `ExpiringServicesAlert.jsx` + `ScheduledCalendar.jsx`: receita, contagem
/// de OS, avaliação média, gráfico por status, garantias expirando em 7
/// dias, próximos agendamentos e tempo médio de aceite/chegada/execução
/// (`ServiceMetrics.jsx`, via `service_status_transitions`, gravada por
/// trigger). Tudo calculado no cliente a partir de `listAllForStaff()`/
/// `listAll()` — sem paginação/otimização de query para grandes volumes
/// ainda. Sem otimizador de rota — precisaria de mapa (ver /MIGRATION.md).
class AnalyticsTab extends StatelessWidget {
  const AnalyticsTab({super.key});

  @override
  Widget build(BuildContext context) {
    final repository = ServiceRequestRepository(ReparoSupabase.client);
    final transitionRepository = ServiceStatusTransitionRepository(ReparoSupabase.client);
    final currency = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');

    return FutureBuilder<(List<ServiceRequest>, List<ServiceStatusTransition>)>(
      future: (
        repository.listAllForStaff(),
        transitionRepository.listAll(),
      ).wait,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        final orders = snapshot.data?.$1 ?? const [];
        final transitions = snapshot.data?.$2 ?? const [];
        final byRequest = <String, List<ServiceStatusTransition>>{};
        for (final t in transitions) {
          (byRequest[t.serviceRequestId] ??= []).add(t);
        }
        final createdAtByRequest = {for (final o in orders) o.id: o.createdAt};
        final avgAccept = averageStatusDuration(createdAtByRequest, byRequest, toStatus: 'aceito');
        final avgArrival = averageStatusDuration(
          createdAtByRequest,
          byRequest,
          toStatus: 'em_andamento',
          fromStatus: 'a_caminho',
        );
        final avgExecution = averageStatusDuration(
          createdAtByRequest,
          byRequest,
          toStatus: 'concluido',
          fromStatus: 'em_andamento',
        );
        final revenue = orders
            .where((o) => o.status == ServiceRequestStatus.concluido)
            .fold<num>(0, (sum, o) => sum + (o.finalPrice ?? o.estimatedPrice ?? 0));
        final ratings = orders.where((o) => o.ratingClient != null).map((o) => o.ratingClient!);
        final avgRating = ratings.isEmpty ? 0 : ratings.reduce((a, b) => a + b) / ratings.length;

        final byStatus = <ServiceRequestStatus, int>{};
        for (final order in orders) {
          byStatus[order.status] = (byStatus[order.status] ?? 0) + 1;
        }

        final now = DateTime.now();
        final expiringSoon = orders
            .where((o) =>
                o.warrantyEndDate != null &&
                o.warrantyEndDate!.isAfter(now) &&
                o.warrantyEndDate!.isBefore(now.add(const Duration(days: 7))))
            .toList()
          ..sort((a, b) => a.warrantyEndDate!.compareTo(b.warrantyEndDate!));

        final scheduled = orders.where((o) => o.modality == 'agendado' && o.scheduledDate != null).toList()
          ..sort((a, b) => a.scheduledDate!.compareTo(b.scheduledDate!));

        return ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Wrap(
              spacing: 16,
              runSpacing: 16,
              children: [
                _StatCard(label: 'Receita (concluídas)', value: currency.format(revenue)),
                _StatCard(label: 'Total de OS', value: '${orders.length}'),
                _StatCard(label: 'Avaliação média', value: '★ ${avgRating.toStringAsFixed(1)}'),
                _StatCard(
                  label: 'Tempo médio de aceite',
                  value: avgAccept == null ? '—' : formatAverageDuration(avgAccept),
                ),
                _StatCard(
                  label: 'Tempo médio de chegada',
                  value: avgArrival == null ? '—' : formatAverageDuration(avgArrival),
                ),
                _StatCard(
                  label: 'Tempo médio de execução',
                  value: avgExecution == null ? '—' : formatAverageDuration(avgExecution),
                ),
              ],
            ),
            const SizedBox(height: 32),
            Text('OS por status', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            SizedBox(
              height: 260,
              child: BarChart(
                BarChartData(
                  barGroups: [
                    for (final entry in byStatus.entries)
                      BarChartGroupData(
                        x: ServiceRequestStatus.values.indexOf(entry.key),
                        barRods: [BarChartRodData(toY: entry.value.toDouble(), color: AppColors.primary)],
                      ),
                  ],
                  titlesData: FlTitlesData(
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          final index = value.toInt();
                          if (index < 0 || index >= ServiceRequestStatus.values.length) {
                            return const SizedBox.shrink();
                          }
                          return Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              ServiceRequestStatus.values[index].label,
                              style: const TextStyle(fontSize: 10),
                            ),
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
            if (expiringSoon.isNotEmpty) ...[
              const SizedBox(height: 32),
              Text('Garantias expirando em 7 dias', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              ...expiringSoon.map(
                (o) => ListTile(
                  leading: const Icon(Icons.warning_amber, color: Colors.amber),
                  title: Text('${o.serviceLabel} · ${o.clientName ?? '—'}'),
                  trailing: Text('${o.warrantyEndDate!.day}/${o.warrantyEndDate!.month}'),
                ),
              ),
            ],
            if (scheduled.isNotEmpty) ...[
              const SizedBox(height: 32),
              Text('Próximos agendamentos', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              ...scheduled.take(20).map(
                    (o) => ListTile(
                      leading: const Icon(Icons.event),
                      title: Text('${o.serviceLabel} · ${o.clientName ?? '—'}'),
                      subtitle: Text(o.providerName ?? 'Sem prestador atribuído'),
                      trailing: Text(
                        '${o.scheduledDate!.day}/${o.scheduledDate!.month} ${o.scheduledTime ?? ''}',
                      ),
                    ),
                  ),
            ],
          ],
        );
      },
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
      width: 220,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 8),
              Text(value, style: Theme.of(context).textTheme.headlineSmall),
            ],
          ),
        ),
      ),
    );
  }
}
