import 'package:flutter/material.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta de `ProviderDocumentReview.jsx` + `UndoProviderAction.jsx` — sem
/// revisão de documentos/fotos individualmente, só o cadastro como um
/// todo. Duas sub-abas: pendentes de aprovação, e todos (busca + bloquear/
/// desbloquear/desfazer decisão).
class ProvidersApprovalTab extends StatefulWidget {
  const ProvidersApprovalTab({super.key});

  @override
  State<ProvidersApprovalTab> createState() => _ProvidersApprovalTabState();
}

class _ProvidersApprovalTabState extends State<ProvidersApprovalTab> with SingleTickerProviderStateMixin {
  late final TabController _tabController = TabController(length: 2, vsync: this);
  final _repository = ProviderRepository(ReparoSupabase.client);
  late Future<List<Provider>> _pendingFuture = _repository.listPendingApproval();
  late Future<List<Provider>> _allFuture = _repository.searchAll();
  final _searchController = TextEditingController();
  String? _actingOnId;

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _reloadPending() => setState(() => _pendingFuture = _repository.listPendingApproval());
  void _reloadAll() => setState(() => _allFuture = _repository.searchAll(query: _searchController.text));

  Future<void> _approve(Provider provider) async {
    setState(() => _actingOnId = provider.id);
    try {
      await _repository.approve(provider.id);
      _reloadPending();
    } finally {
      if (mounted) setState(() => _actingOnId = null);
    }
  }

  Future<void> _reject(Provider provider) async {
    setState(() => _actingOnId = provider.id);
    try {
      await _repository.reject(provider.id, reason: 'Reprovado pelo admin');
      _reloadPending();
    } finally {
      if (mounted) setState(() => _actingOnId = null);
    }
  }

  Future<void> _toggleBlocked(Provider provider) async {
    if (!provider.isBlocked) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Bloquear prestador'),
          content: Text('Bloquear ${provider.name}? Ele deixa de receber novos chamados.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Bloquear')),
          ],
        ),
      );
      if (confirmed != true) return;
    }
    await _repository.setBlocked(provider.id, !provider.isBlocked);
    _reloadAll();
  }

  Future<void> _undo(Provider provider) async {
    await _repository.undoApprovalDecision(provider.id);
    _reloadPending();
    _reloadAll();
  }

  Future<void> _openDocumentReview(Provider provider) async {
    await showDialog<void>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text('Documentos de ${provider.name}'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (provider.photoUrl != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Image.network(provider.photoUrl!, height: 120, fit: BoxFit.cover),
                  ),
                _DocumentRow(
                  label: 'Documento de identificação',
                  url: provider.idHoldingDocumentUrl,
                  status: provider.idHoldingDocumentStatus,
                  onDecide: (approved) async {
                    await _repository.setDocumentStatus(
                      providerId: provider.id,
                      document: 'id_holding_document',
                      status: approved ? 'aprovado' : 'rejeitado',
                    );
                    setDialogState(() {});
                    _reloadAll();
                  },
                ),
                _DocumentRow(
                  label: 'Comprovante de endereço',
                  url: provider.addressProofUrl,
                  status: provider.addressProofStatus,
                  onDecide: (approved) async {
                    await _repository.setDocumentStatus(
                      providerId: provider.id,
                      document: 'address_proof',
                      status: approved ? 'aprovado' : 'rejeitado',
                    );
                    setDialogState(() {});
                    _reloadAll();
                  },
                ),
                if (provider.companyName != null) ...[
                  const Divider(),
                  Text('CNPJ: ${provider.companyName} (${provider.companyFantasyName ?? '—'})'),
                  Text(provider.fiscalDataVerified ? 'Dados fiscais verificados' : 'Dados fiscais não verificados'),
                ],
              ],
            ),
          ),
          actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Fechar'))],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TabBar(controller: _tabController, tabs: const [Tab(text: 'Pendentes'), Tab(text: 'Todos')]),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              FutureBuilder<List<Provider>>(
                future: _pendingFuture,
                builder: (context, snapshot) {
                  final providers = snapshot.data ?? const [];
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (providers.isEmpty) return const Center(child: Text('Nenhum cadastro pendente.'));
                  return ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: providers.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final provider = providers[index];
                      final acting = _actingOnId == provider.id;
                      return Card(
                        child: ListTile(
                          title: Text(provider.name),
                          subtitle: Text([provider.email, provider.phone].nonNulls.join(' · ')),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.check_circle, color: Colors.green),
                                tooltip: 'Aprovar',
                                onPressed: acting ? null : () => _approve(provider),
                              ),
                              IconButton(
                                icon: Icon(Icons.cancel, color: AppColors.destructive),
                                tooltip: 'Reprovar',
                                onPressed: acting ? null : () => _reject(provider),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
              Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _searchController,
                            decoration: const InputDecoration(labelText: 'Buscar por nome, telefone ou e-mail'),
                            onSubmitted: (_) => _reloadAll(),
                          ),
                        ),
                        const SizedBox(width: 8),
                        FilledButton(onPressed: _reloadAll, child: const Text('Buscar')),
                      ],
                    ),
                  ),
                  Expanded(
                    child: FutureBuilder<List<Provider>>(
                      future: _allFuture,
                      builder: (context, snapshot) {
                        final providers = snapshot.data ?? const [];
                        if (snapshot.connectionState == ConnectionState.waiting) {
                          return const Center(child: CircularProgressIndicator());
                        }
                        if (providers.isEmpty) return const Center(child: Text('Nenhum prestador encontrado.'));
                        return ListView.builder(
                          itemCount: providers.length,
                          itemBuilder: (context, index) {
                            final provider = providers[index];
                            return ListTile(
                              title: Text(provider.name),
                              subtitle: Text(
                                '${provider.isApproved ? 'Aprovado' : provider.isRejected ? 'Reprovado' : 'Pendente'}'
                                '${provider.isBlocked ? ' · Bloqueado' : ''}',
                              ),
                              onTap: () => _openDocumentReview(provider),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.undo),
                                    tooltip: 'Desfazer decisão',
                                    onPressed: (provider.isApproved || provider.isRejected)
                                        ? () => _undo(provider)
                                        : null,
                                  ),
                                  IconButton(
                                    icon: Icon(provider.isBlocked ? Icons.lock_open : Icons.block),
                                    tooltip: provider.isBlocked ? 'Desbloquear' : 'Bloquear',
                                    onPressed: () => _toggleBlocked(provider),
                                  ),
                                ],
                              ),
                            );
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _DocumentRow extends StatelessWidget {
  const _DocumentRow({
    required this.label,
    required this.url,
    required this.status,
    required this.onDecide,
  });

  final String label;
  final String? url;
  final String status;
  final void Function(bool approved) onDecide;

  @override
  Widget build(BuildContext context) {
    if (url == null) {
      return ListTile(dense: true, title: Text(label), subtitle: const Text('Não enviado'));
    }
    return ListTile(
      dense: true,
      title: Text(label),
      subtitle: Text(status),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            icon: const Icon(Icons.check_circle, color: Colors.green, size: 20),
            onPressed: () => onDecide(true),
          ),
          IconButton(
            icon: Icon(Icons.cancel, color: AppColors.destructive, size: 20),
            onPressed: () => onDecide(false),
          ),
        ],
      ),
    );
  }
}
