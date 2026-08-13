import 'package:flutter/material.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Gestão do catálogo novo (`service_groups` → `professions` → `sub_services`)
/// — não existia nenhuma tela pra isso no admin (ver /MIGRATION.md, "Novos
/// gaps descobertos"). Sem porta direta do legado: o catálogo antigo
/// (`offered_services`) era gerenciado de outra forma, essa hierarquia é
/// nova. "Desativar" em vez de excluir — `professions`/`sub_services` são
/// referenciadas por `service_requests` (FK), então soft-delete via
/// `is_active` é o único jeito seguro de tirar algo de circulação.
class CatalogTab extends StatefulWidget {
  const CatalogTab({super.key});

  @override
  State<CatalogTab> createState() => _CatalogTabState();
}

class _CatalogTabState extends State<CatalogTab> with SingleTickerProviderStateMixin {
  final _repository = CatalogRepository(ReparoSupabase.client);
  late final TabController _tabController = TabController(length: 3, vsync: this);

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Grupos'),
            Tab(text: 'Profissões'),
            Tab(text: 'Sub-serviços'),
          ],
        ),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              _GroupsList(repository: _repository),
              _ProfessionsList(repository: _repository),
              _SubServicesList(repository: _repository),
            ],
          ),
        ),
      ],
    );
  }
}

class _GroupsList extends StatefulWidget {
  const _GroupsList({required this.repository});

  final CatalogRepository repository;

  @override
  State<_GroupsList> createState() => _GroupsListState();
}

class _GroupsListState extends State<_GroupsList> {
  late Future<List<CatalogGroup>> _future = widget.repository.listAllGroups();

  void _reload() => setState(() => _future = widget.repository.listAllGroups());

  Future<void> _openDialog({CatalogGroup? existing}) async {
    final slugController = TextEditingController(text: existing?.slug ?? '');
    final labelController = TextEditingController(text: existing?.label ?? '');
    final iconController = TextEditingController(text: existing?.iconKey ?? '');
    var isActive = existing?.isActive ?? true;

    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(existing == null ? 'Novo grupo' : 'Editar grupo'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: slugController, decoration: const InputDecoration(labelText: 'Slug')),
              TextField(controller: labelController, decoration: const InputDecoration(labelText: 'Rótulo')),
              TextField(
                controller: iconController,
                decoration: const InputDecoration(labelText: 'Ícone (opcional)'),
              ),
              SwitchListTile(
                title: const Text('Ativo'),
                value: isActive,
                onChanged: (v) => setDialogState(() => isActive = v),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Salvar')),
          ],
        ),
      ),
    );

    if (saved == true && slugController.text.trim().isNotEmpty && labelController.text.trim().isNotEmpty) {
      await widget.repository.upsertGroup(
        id: existing?.id,
        slug: slugController.text.trim(),
        label: labelController.text.trim(),
        iconKey: iconController.text.trim().isEmpty ? null : iconController.text.trim(),
        sortOrder: existing?.sortOrder ?? 0,
        isActive: isActive,
      );
      _reload();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton(onPressed: () => _openDialog(), child: const Icon(Icons.add)),
      body: FutureBuilder<List<CatalogGroup>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final groups = snapshot.data ?? const [];
          if (groups.isEmpty) return const Center(child: Text('Nenhum grupo cadastrado.'));
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: groups.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final group = groups[index];
              return Card(
                child: ListTile(
                  title: Text(group.label),
                  subtitle: Text('${group.slug}${group.isActive ? '' : ' · inativo'}'),
                  trailing: IconButton(icon: const Icon(Icons.edit), onPressed: () => _openDialog(existing: group)),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _ProfessionsList extends StatefulWidget {
  const _ProfessionsList({required this.repository});

  final CatalogRepository repository;

  @override
  State<_ProfessionsList> createState() => _ProfessionsListState();
}

class _ProfessionsListState extends State<_ProfessionsList> {
  late Future<(List<Profession>, List<CatalogGroup>)> _future = _load();

  Future<(List<Profession>, List<CatalogGroup>)> _load() async {
    final professions = await widget.repository.listAllProfessions();
    final groups = await widget.repository.listAllGroups();
    return (professions, groups);
  }

  void _reload() => setState(() => _future = _load());

  Future<void> _openDialog({required List<CatalogGroup> groups, Profession? existing}) async {
    if (groups.isEmpty) return;
    final slugController = TextEditingController(text: existing?.slug ?? '');
    final nameController = TextEditingController(text: existing?.name ?? '');
    final descriptionController = TextEditingController(text: existing?.description ?? '');
    var groupId = existing?.groupId ?? groups.first.id;
    var isActive = existing?.isActive ?? true;

    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(existing == null ? 'Nova profissão' : 'Editar profissão'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                initialValue: groupId,
                decoration: const InputDecoration(labelText: 'Grupo'),
                items: groups.map((g) => DropdownMenuItem(value: g.id, child: Text(g.label))).toList(),
                onChanged: (v) => setDialogState(() => groupId = v ?? groupId),
              ),
              TextField(controller: slugController, decoration: const InputDecoration(labelText: 'Slug')),
              TextField(controller: nameController, decoration: const InputDecoration(labelText: 'Nome')),
              TextField(
                controller: descriptionController,
                decoration: const InputDecoration(labelText: 'Descrição (opcional)'),
              ),
              SwitchListTile(
                title: const Text('Ativo'),
                value: isActive,
                onChanged: (v) => setDialogState(() => isActive = v),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Salvar')),
          ],
        ),
      ),
    );

    if (saved == true && slugController.text.trim().isNotEmpty && nameController.text.trim().isNotEmpty) {
      await widget.repository.upsertProfession(
        id: existing?.id,
        groupId: groupId,
        slug: slugController.text.trim(),
        name: nameController.text.trim(),
        description: descriptionController.text.trim().isEmpty ? null : descriptionController.text.trim(),
        sortOrder: existing?.sortOrder ?? 0,
        isActive: isActive,
      );
      _reload();
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<(List<Profession>, List<CatalogGroup>)>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        final (professions, groups) = snapshot.data ?? (const <Profession>[], const <CatalogGroup>[]);
        final groupNames = {for (final g in groups) g.id: g.label};
        return Scaffold(
          floatingActionButton: FloatingActionButton(
            onPressed: groups.isEmpty ? null : () => _openDialog(groups: groups),
            child: const Icon(Icons.add),
          ),
          body: professions.isEmpty
              ? const Center(child: Text('Nenhuma profissão cadastrada.'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: professions.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final profession = professions[index];
                    return Card(
                      child: ListTile(
                        title: Text(profession.name),
                        subtitle: Text(
                          '${groupNames[profession.groupId] ?? '—'} · ${profession.slug}'
                          '${profession.isActive ? '' : ' · inativo'}',
                        ),
                        trailing: IconButton(
                          icon: const Icon(Icons.edit),
                          onPressed: () => _openDialog(groups: groups, existing: profession),
                        ),
                      ),
                    );
                  },
                ),
        );
      },
    );
  }
}

class _SubServicesList extends StatefulWidget {
  const _SubServicesList({required this.repository});

  final CatalogRepository repository;

  @override
  State<_SubServicesList> createState() => _SubServicesListState();
}

class _SubServicesListState extends State<_SubServicesList> {
  late Future<(List<SubService>, List<Profession>)> _future = _load();

  Future<(List<SubService>, List<Profession>)> _load() async {
    final subServices = await widget.repository.listAllSubServices();
    final professions = await widget.repository.listAllProfessions();
    return (subServices, professions);
  }

  void _reload() => setState(() => _future = _load());

  Future<void> _openDialog({required List<Profession> professions, SubService? existing}) async {
    if (professions.isEmpty) return;
    final slugController = TextEditingController(text: existing?.slug ?? '');
    final nameController = TextEditingController(text: existing?.name ?? '');
    var professionId = existing?.professionId ?? professions.first.id;
    var isActive = existing?.isActive ?? true;

    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(existing == null ? 'Novo sub-serviço' : 'Editar sub-serviço'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                initialValue: professionId,
                decoration: const InputDecoration(labelText: 'Profissão'),
                items: professions.map((p) => DropdownMenuItem(value: p.id, child: Text(p.name))).toList(),
                onChanged: (v) => setDialogState(() => professionId = v ?? professionId),
              ),
              TextField(controller: slugController, decoration: const InputDecoration(labelText: 'Slug')),
              TextField(controller: nameController, decoration: const InputDecoration(labelText: 'Nome')),
              SwitchListTile(
                title: const Text('Ativo'),
                value: isActive,
                onChanged: (v) => setDialogState(() => isActive = v),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Salvar')),
          ],
        ),
      ),
    );

    if (saved == true && slugController.text.trim().isNotEmpty && nameController.text.trim().isNotEmpty) {
      await widget.repository.upsertSubService(
        id: existing?.id,
        professionId: professionId,
        slug: slugController.text.trim(),
        name: nameController.text.trim(),
        sortOrder: existing?.sortOrder ?? 0,
        isActive: isActive,
      );
      _reload();
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<(List<SubService>, List<Profession>)>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        final (subServices, professions) = snapshot.data ?? (const <SubService>[], const <Profession>[]);
        final professionNames = {for (final p in professions) p.id: p.name};
        return Scaffold(
          floatingActionButton: FloatingActionButton(
            onPressed: professions.isEmpty ? null : () => _openDialog(professions: professions),
            child: const Icon(Icons.add),
          ),
          body: subServices.isEmpty
              ? const Center(child: Text('Nenhum sub-serviço cadastrado.'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: subServices.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final subService = subServices[index];
                    return Card(
                      child: ListTile(
                        title: Text(subService.name),
                        subtitle: Text(
                          '${professionNames[subService.professionId] ?? '—'} · ${subService.slug}'
                          '${subService.isActive ? '' : ' · inativo'}',
                        ),
                        trailing: IconButton(
                          icon: const Icon(Icons.edit),
                          onPressed: () => _openDialog(professions: professions, existing: subService),
                        ),
                      ),
                    );
                  },
                ),
        );
      },
    );
  }
}
