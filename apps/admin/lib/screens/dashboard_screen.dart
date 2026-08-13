import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:reparo_shared/reparo_shared.dart';

import 'activity_log_tab.dart';
import 'additional_points_tab.dart';
import 'analytics_tab.dart';
import 'attendants_tab.dart';
import 'catalog_tab.dart';
import 'clients_tab.dart';
import 'coupons_tab.dart';
import 'finance_tab.dart';
import 'pricing_tab.dart';
import 'providers_approval_tab.dart';
import 'service_requests_tab.dart';
import 'surcharge_rules_tab.dart';
import 'tickets_tab.dart';

/// Porta de `legacy/src/pages/AdminPanel.jsx` + `DashboardAdmin.jsx`.
/// Faltam: checklists configuráveis por tipo de serviço (sem tabela no
/// schema pra isso ainda), revisão individual de documento/foto de
/// prestador, respostas rápidas (templates) nos tickets, relatórios em PDF.
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController = TabController(length: 13, vsync: this);

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthController>().user;

    return Scaffold(
      appBar: AppBar(
        title: Text('Admin — ${user?.fullName ?? ''}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sair',
            onPressed: () => context.read<AuthController>().signOut(),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: const [
            Tab(text: 'Visão geral', icon: Icon(Icons.bar_chart)),
            Tab(text: 'Serviços', icon: Icon(Icons.build)),
            Tab(text: 'Prestadores', icon: Icon(Icons.person_search)),
            Tab(text: 'Clientes', icon: Icon(Icons.people)),
            Tab(text: 'Financeiro', icon: Icon(Icons.account_balance)),
            Tab(text: 'Preços', icon: Icon(Icons.sell)),
            Tab(text: 'Catálogo', icon: Icon(Icons.category)),
            Tab(text: 'Sobretaxas', icon: Icon(Icons.nightlight_round)),
            Tab(text: 'Cupons', icon: Icon(Icons.local_offer)),
            Tab(text: 'Pontos', icon: Icon(Icons.stars)),
            Tab(text: 'Tickets', icon: Icon(Icons.support_agent)),
            Tab(text: 'Atendentes', icon: Icon(Icons.badge)),
            Tab(text: 'Log de atividade', icon: Icon(Icons.history)),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          AnalyticsTab(),
          ServiceRequestsTab(),
          ProvidersApprovalTab(),
          ClientsTab(),
          FinanceTab(),
          PricingTab(),
          CatalogTab(),
          SurchargeRulesTab(),
          CouponsTab(),
          AdditionalPointsTab(),
          TicketsTab(),
          AttendantsTab(),
          ActivityLogTab(),
        ],
      ),
    );
  }
}
