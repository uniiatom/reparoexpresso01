import 'package:flutter/material.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta simplificada de `legacy/src/pages/ProviderRegister.jsx`: dados
/// básicos + profissões atendidas, cria o registro em `providers` (pendente
/// de aprovação do admin). **Sem** upload de documentos (RG/CNH), cadastro de
/// CNPJ ou aceite de termos ainda — ver Fase 4 em /MIGRATION.md. RLS
/// (`providers_insert`) libera o próprio usuário criar seu registro.
///
/// Adaptado pro schema real (ver /MIGRATION.md, seção 0.1): `providers` não
/// tem mais a coluna `specialties` (array de texto livre) — habilidades
/// agora são linhas em `provider_professions`, referenciando o catálogo
/// real (`professions`).
class ProviderRegisterScreen extends StatefulWidget {
  const ProviderRegisterScreen({super.key, required this.onDone});

  final VoidCallback onDone;

  @override
  State<ProviderRegisterScreen> createState() => _ProviderRegisterScreenState();
}

class _ProviderRegisterScreenState extends State<ProviderRegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _bioController = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();
  late final Future<List<Profession>> _professionsFuture =
      CatalogRepository(ReparoSupabase.client).listProfessions();
  final Set<String> _selectedProfessionIds = {};
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _bioController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final uid = ReparoSupabase.client.auth.currentUser!.id;
      final email = ReparoSupabase.client.auth.currentUser!.email;
      final provider = await ReparoSupabase.client
          .from('providers')
          .insert({
            'user_id': uid,
            'name': _nameController.text.trim(),
            'phone': _phoneController.text.trim(),
            'email': email,
            'bio': _bioController.text.trim().isEmpty ? null : _bioController.text.trim(),
            'city': _cityController.text.trim().isEmpty ? null : _cityController.text.trim(),
            'state': _stateController.text.trim().isEmpty ? null : _stateController.text.trim(),
          })
          .select('id')
          .single();

      if (_selectedProfessionIds.isNotEmpty) {
        await ProviderRepository(ReparoSupabase.client)
            .setProfessions(provider['id'] as String, _selectedProfessionIds.toList());
      }
      widget.onDone();
    } catch (e) {
      setState(() => _error = 'Não foi possível enviar o cadastro. Tente novamente.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cadastro de prestador')),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisSize: MainAxisSize.min,
                children: [
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
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _cityController,
                          decoration: const InputDecoration(labelText: 'Cidade'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: _stateController,
                          decoration: const InputDecoration(labelText: 'UF'),
                          maxLength: 2,
                        ),
                      ),
                    ],
                  ),
                  TextFormField(
                    controller: _bioController,
                    maxLines: 3,
                    decoration: const InputDecoration(labelText: 'Sobre você (opcional)'),
                  ),
                  const SizedBox(height: 16),
                  Text('Profissões que você atende', style: Theme.of(context).textTheme.titleSmall),
                  const SizedBox(height: 8),
                  FutureBuilder<List<Profession>>(
                    future: _professionsFuture,
                    builder: (context, snapshot) {
                      final professions = snapshot.data ?? const [];
                      if (snapshot.connectionState == ConnectionState.waiting) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8),
                          child: LinearProgressIndicator(),
                        );
                      }
                      return Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: professions.map((profession) {
                          return FilterChip(
                            label: Text(profession.name),
                            selected: _selectedProfessionIds.contains(profession.id),
                            onSelected: (selected) => setState(() {
                              if (selected) {
                                _selectedProfessionIds.add(profession.id);
                              } else {
                                _selectedProfessionIds.remove(profession.id);
                              }
                            }),
                          );
                        }).toList(),
                      );
                    },
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    Text(_error!, style: TextStyle(color: AppColors.destructive)),
                  ],
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: _submitting ? null : _submit,
                    child: Text(_submitting ? 'Enviando…' : 'Enviar cadastro'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
