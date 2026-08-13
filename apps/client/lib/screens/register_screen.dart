import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta simplificada de `legacy/src/pages/ClientRegister.jsx`. No app
/// legado, criar conta (Supabase Auth) e completar o perfil de cliente
/// (`clients`) eram passos separados; aqui viraram um único formulário —
/// mais direto para o MVP mobile.
class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _cpfController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _submitting = false;
  bool _termsAccepted = false;
  String? _error;
  XFile? _photo;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _cpfController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (file != null) setState(() => _photo = file);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_termsAccepted) {
      setState(() => _error = 'Você precisa aceitar os termos de uso para continuar.');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final authController = context.read<AuthController>();
      await authController.signUp(
        email: _emailController.text.trim(),
        password: _passwordController.text,
        fullName: _nameController.text.trim(),
      );

      final hasSession = ReparoSupabase.client.auth.currentSession != null;
      if (!hasSession) {
        if (!mounted) return;
        setState(() {
          _submitting = false;
          _error = 'Conta criada! Confirme seu e-mail e faça login para continuar.';
        });
        return;
      }

      String? photoUrl;
      if (_photo != null) {
        final bytes = await _photo!.readAsBytes();
        photoUrl = await StorageRepository(ReparoSupabase.client)
            .uploadBytes(Uint8List.fromList(bytes), fileName: _photo!.name);
      }

      await ClientRepository(ReparoSupabase.client).createMine(
        name: _nameController.text.trim(),
        phone: _phoneController.text.trim(),
        cpf: _cpfController.text.trim().isEmpty ? null : _cpfController.text.trim(),
        photoUrl: photoUrl,
        termsAccepted: true,
      );
      // Router redireciona para /home automaticamente (authController mudou).
    } catch (e) {
      setState(() => _error = 'Não foi possível concluir o cadastro. Tente novamente.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cadastro de cliente')),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Center(
                      child: GestureDetector(
                        onTap: _pickPhoto,
                        child: CircleAvatar(
                          radius: 40,
                          child: _photo == null
                              ? const Icon(Icons.add_a_photo)
                              : const Icon(Icons.check, size: 32),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Center(child: Text(_photo?.name ?? 'Foto de perfil (opcional)')),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _nameController,
                      decoration: const InputDecoration(labelText: 'Nome completo'),
                      validator: (v) => (v == null || v.length < 3) ? 'Informe seu nome' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(labelText: 'Telefone'),
                      validator: (v) => (v == null || v.length < 8) ? 'Informe um telefone válido' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _cpfController,
                      decoration: const InputDecoration(labelText: 'CPF (opcional)'),
                    ),
                    const Divider(height: 32),
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(labelText: 'E-mail'),
                      validator: (v) => (v == null || v.isEmpty) ? 'Informe o e-mail' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: true,
                      decoration: const InputDecoration(labelText: 'Senha'),
                      validator: (v) =>
                          (v == null || v.length < 6) ? 'A senha precisa ter ao menos 6 caracteres' : null,
                    ),
                    const SizedBox(height: 8),
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      controlAffinity: ListTileControlAffinity.leading,
                      value: _termsAccepted,
                      onChanged: (v) => setState(() => _termsAccepted = v ?? false),
                      title: const Text('Li e aceito os termos de uso da plataforma'),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 8),
                      Text(_error!, style: TextStyle(color: AppColors.destructive)),
                    ],
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _submitting ? null : _submit,
                      child: Text(_submitting ? 'Enviando…' : 'Criar conta'),
                    ),
                    const SizedBox(height: 16),
                    TextButton(
                      onPressed: () => context.go('/login'),
                      child: const Text('Já tem conta? Entrar'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
