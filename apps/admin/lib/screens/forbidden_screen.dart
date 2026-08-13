import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Mostrado quando um usuário autenticado, mas sem role `admin`/`attendant`,
/// tenta acessar o painel — parte client-side do isolamento de acesso entre
/// os 3 apps (a RLS do Supabase é a outra metade, e vale independente desta
/// tela).
class ForbiddenScreen extends StatelessWidget {
  const ForbiddenScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.lock, size: 48, color: AppColors.destructive),
              const SizedBox(height: 16),
              const Text(
                'Acesso restrito a administradores e atendentes.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => context.read<AuthController>().signOut(),
                child: const Text('Sair'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
