import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta simplificada de `legacy/src/pages/Home.jsx`: grid de profissões
/// por grupo, com busca. Usa o catálogo novo (`service_groups` →
/// `professions`), que substituiu `offered_services` — ver /MIGRATION.md.
/// Sem splash de marca, mapa de frota, favoritos ou aba de indicação ainda
/// — ver checklist da Fase 3.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final _future = CatalogRepository(ReparoSupabase.client).listGroups();

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthController>().user;

    return Scaffold(
      appBar: AppBar(
        title: Text('Olá, ${user?.fullName.isNotEmpty == true ? user!.fullName : 'cliente'}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.receipt_long),
            tooltip: 'Meus pedidos',
            onPressed: () => context.push('/orders'),
          ),
          IconButton(
            icon: const Icon(Icons.person),
            tooltip: 'Meu perfil',
            onPressed: () => context.push('/profile'),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sair',
            onPressed: () => context.read<AuthController>().signOut(),
          ),
        ],
      ),
      body: FutureBuilder<List<CatalogGroup>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Erro ao carregar catálogo: ${snapshot.error}'));
          }
          final groups = snapshot.data ?? const [];
          if (groups.isEmpty) {
            return const Center(child: Text('Nenhum grupo de serviço cadastrado.'));
          }
          return _HomeTabs(groups: groups);
        },
      ),
    );
  }
}

class _HomeTabs extends StatefulWidget {
  const _HomeTabs({required this.groups});

  final List<CatalogGroup> groups;

  @override
  State<_HomeTabs> createState() => _HomeTabsState();
}

class _HomeTabsState extends State<_HomeTabs> with SingleTickerProviderStateMixin {
  late final _tabController = TabController(length: widget.groups.length, vsync: this);
  final _repository = CatalogRepository(ReparoSupabase.client);
  late final _futures = {for (final g in widget.groups) g.id: _repository.listProfessions(groupId: g.id)};
  String _query = '';

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  List<Profession> _filter(List<Profession> professions) {
    if (_query.isEmpty) return professions;
    final q = _query.toLowerCase();
    return professions.where((p) => p.name.toLowerCase().contains(q)).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TabBar(
          controller: _tabController,
          tabs: widget.groups.map((g) => Tab(text: g.label)).toList(),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            decoration: const InputDecoration(
              prefixIcon: Icon(Icons.search),
              hintText: 'Buscar serviço…',
            ),
            onChanged: (v) => setState(() => _query = v),
          ),
        ),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: widget.groups
                .map((g) => _ProfessionGrid(future: _futures[g.id]!, filter: _filter))
                .toList(),
          ),
        ),
      ],
    );
  }
}

class _ProfessionGrid extends StatelessWidget {
  const _ProfessionGrid({required this.future, required this.filter});

  final Future<List<Profession>> future;
  final List<Profession> Function(List<Profession>) filter;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Profession>>(
      future: future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('Erro ao carregar serviços: ${snapshot.error}'));
        }
        final professions = filter(snapshot.data ?? const []);
        if (professions.isEmpty) {
          return const Center(child: Text('Nenhum serviço encontrado.'));
        }
        return GridView.builder(
          padding: const EdgeInsets.all(16),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.3,
          ),
          itemCount: professions.length,
          itemBuilder: (context, index) {
            final profession = professions[index];
            return Card(
              child: InkWell(
                borderRadius: BorderRadius.circular(AppColors.radius),
                onTap: () => context.push('/request', extra: profession),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Icon(Icons.build, color: AppColors.primary, size: 32),
                      Text(profession.name, style: Theme.of(context).textTheme.titleMedium),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }
}
