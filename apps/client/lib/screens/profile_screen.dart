import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta simplificada de `legacy/src/pages/UserProfile.jsx`: editar
/// nome/telefone + navegação para carteira, favoritos e fidelidade. Sem
/// foto de perfil, endereços salvos ou preferências de notificação ainda.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _repository = ClientRepository(ReparoSupabase.client);
  late final Future<Client?> _future = _repository.findMine();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _saving = false;
  String? _clientId;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_clientId == null) return;
    setState(() => _saving = true);
    try {
      await _repository.updateMine(
        clientId: _clientId!,
        name: _nameController.text.trim(),
        phone: _phoneController.text.trim(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Perfil atualizado!')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sessionUser = context.watch<AuthController>().user;

    return Scaffold(
      appBar: AppBar(title: const Text('Meu perfil')),
      body: FutureBuilder<Client?>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final client = snapshot.data;
          if (client != null && _clientId == null) {
            _clientId = client.id;
            _nameController.text = client.name;
            _phoneController.text = client.phone;
          }

          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Text(sessionUser?.email ?? '', style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 24),
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Nome'),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Telefone'),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: (_clientId == null || _saving) ? null : _save,
                child: Text(_saving ? 'Salvando…' : 'Salvar'),
              ),
              const Divider(height: 48),
              ListTile(
                leading: const Icon(Icons.account_balance_wallet),
                title: const Text('Carteira'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/wallet'),
              ),
              ListTile(
                leading: const Icon(Icons.favorite),
                title: const Text('Favoritos'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/favorites'),
              ),
              ListTile(
                leading: const Icon(Icons.card_giftcard),
                title: const Text('Fidelidade'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/loyalty'),
              ),
              ListTile(
                leading: const Icon(Icons.groups),
                title: const Text('Indique e ganhe'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/referral'),
              ),
              ListTile(
                leading: const Icon(Icons.notifications),
                title: const Text('Notificações'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/notifications'),
              ),
              ListTile(
                leading: const Icon(Icons.event_repeat),
                title: const Text('Lembretes de manutenção'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/reminders'),
              ),
              ListTile(
                leading: const Icon(Icons.repeat),
                title: const Text('Serviços recorrentes'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/recurring'),
              ),
              ListTile(
                leading: const Icon(Icons.support_agent),
                title: const Text('Abrir chamado de suporte'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/support/new'),
              ),
              ListTile(
                leading: const Icon(Icons.insights),
                title: const Text('Meu histórico e gastos'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/dossie'),
              ),
              const Divider(height: 32),
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
