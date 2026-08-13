import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta simplificada de `legacy/src/pages/MeusPedidos.jsx` + `MeusServicos.jsx`,
/// em tempo real via Supabase Realtime. Sem filtros por aba (novos/ativos/
/// concluídos) nem tracking detalhado ainda — ver Fase 3 em /MIGRATION.md.
class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  late final _stream = ServiceRequestRepository(ReparoSupabase.client).watchMine();
  final _dateFormat = DateFormat('dd/MM/yyyy HH:mm');

  Color _statusColor(ServiceRequestStatus status) {
    return switch (status) {
      ServiceRequestStatus.aguardando || ServiceRequestStatus.emEspera => AppColors.chart5,
      ServiceRequestStatus.aceito => AppColors.chart2,
      ServiceRequestStatus.aCaminho => AppColors.chart4,
      ServiceRequestStatus.emAndamento || ServiceRequestStatus.concluido => AppColors.chart3,
      ServiceRequestStatus.cancelado => AppColors.destructive,
      ServiceRequestStatus.agendado => AppColors.chart1,
    };
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Meus pedidos')),
      body: StreamBuilder<List<ServiceRequest>>(
        stream: _stream,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Erro: ${snapshot.error}'));
          }
          final orders = snapshot.data ?? const [];
          if (orders.isEmpty) {
            return const Center(child: Text('Você ainda não solicitou nenhum serviço.'));
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: orders.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final order = orders[index];
              return Card(
                child: ListTile(
                  onTap: () => context.push('/orders/detail', extra: order),
                  title: Text(order.serviceLabel),
                  subtitle: Text(_dateFormat.format(order.createdAt.toLocal())),
                  trailing: Chip(
                    label: Text(order.status.label),
                    backgroundColor: _statusColor(order.status).withValues(alpha: 0.2),
                    labelStyle: TextStyle(color: _statusColor(order.status)),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
