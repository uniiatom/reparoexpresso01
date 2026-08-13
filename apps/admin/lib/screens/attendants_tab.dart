import 'package:flutter/material.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta de `legacy/src/components/admin/AttendantsManager.jsx` — usa a
/// Edge Function `adminManageUsers` (cria contas reais no Supabase Auth).
class AttendantsTab extends StatefulWidget {
  const AttendantsTab({super.key});

  @override
  State<AttendantsTab> createState() => _AttendantsTabState();
}

class _AttendantsTabState extends State<AttendantsTab> {
  final _repository = AdminUserRepository(ReparoSupabase.client);
  late Future<List<Profile>> _future = _repository.listAll();

  void _reload() => setState(() => _future = _repository.listAll());

  Future<void> _openCreateDialog() async {
    final nameController = TextEditingController();
    final emailController = TextEditingController();
    final passwordController = TextEditingController();

    final created = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Novo atendente'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameController, decoration: const InputDecoration(labelText: 'Nome')),
            TextField(controller: emailController, decoration: const InputDecoration(labelText: 'E-mail')),
            TextField(
              controller: passwordController,
              decoration: const InputDecoration(labelText: 'Senha (mín. 6 caracteres)'),
              obscureText: true,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Criar')),
        ],
      ),
    );

    if (created == true &&
        nameController.text.trim().isNotEmpty &&
        emailController.text.trim().isNotEmpty &&
        passwordController.text.length >= 6) {
      await _repository.createAttendant(
        email: emailController.text.trim(),
        password: passwordController.text,
        fullName: nameController.text.trim(),
      );
      _reload();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton(onPressed: _openCreateDialog, child: const Icon(Icons.add)),
      body: FutureBuilder<List<Profile>>(
        future: _future,
        builder: (context, snapshot) {
          final users = (snapshot.data ?? const [])
              .where((u) => u.role == AppRole.attendant || u.role == AppRole.user)
              .toList();
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (users.isEmpty) return const Center(child: Text('Nenhum usuário.'));
          return ListView.builder(
            itemCount: users.length,
            itemBuilder: (context, index) {
              final user = users[index];
              final isAttendant = user.role == AppRole.attendant;
              return ListTile(
                title: Text(user.fullName ?? user.email ?? '—'),
                subtitle: Text(user.email ?? ''),
                trailing: Switch(
                  value: isAttendant,
                  onChanged: (v) async {
                    await _repository.setActive(user.id, active: v);
                    _reload();
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }
}
