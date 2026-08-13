import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:reparo_shared/reparo_shared.dart';

/// Porta de `legacy/src/pages/ProviderCNPJRegistration.jsx` + documento de
/// identificação + tipo de veículo (usado em reboque). Validação de CNPJ
/// chama uma API pública gratuita já embutida na Edge Function
/// `validateCNPJ` — sem credencial minha envolvida.
///
/// Adaptado pro schema real (ver /MIGRATION.md, seção 0.1): não existe mais
/// upload separado de CNH/CRLV como arquivos — só um slot genérico de
/// "documento de identificação" (`id_holding_document_url`) revisável pelo
/// admin, e o CRLV vira só um campo de texto com o tipo de veículo
/// (`crlv_vehicle_type`, sem arquivo).
class ProviderDocumentsScreen extends StatefulWidget {
  const ProviderDocumentsScreen({super.key, required this.providerId});

  final String providerId;

  @override
  State<ProviderDocumentsScreen> createState() => _ProviderDocumentsScreenState();
}

class _ProviderDocumentsScreenState extends State<ProviderDocumentsScreen> {
  final _repository = ProviderDocumentRepository(ReparoSupabase.client);
  final _storage = StorageRepository(ReparoSupabase.client);
  final _cnpjController = TextEditingController();
  final _vehicleTypeController = TextEditingController();
  Map<String, dynamic>? _companyData;
  bool _validating = false;
  bool _savingCnpj = false;
  String? _cnpjError;

  XFile? _identityFile;
  bool _uploadingIdentity = false;
  bool _savingVehicleType = false;

  @override
  void dispose() {
    _cnpjController.dispose();
    _vehicleTypeController.dispose();
    super.dispose();
  }

  Future<void> _validateCnpj() async {
    setState(() {
      _validating = true;
      _cnpjError = null;
    });
    try {
      final result = await _repository.validateCnpj(_cnpjController.text.trim());
      if (result['valid'] == true) {
        setState(() => _companyData = result['company_data'] as Map<String, dynamic>);
      } else {
        setState(() => _cnpjError = result['error'] as String? ?? 'CNPJ inválido');
      }
    } catch (e) {
      setState(() => _cnpjError = 'Erro ao validar CNPJ. Tente novamente.');
    } finally {
      if (mounted) setState(() => _validating = false);
    }
  }

  Future<void> _saveCnpj() async {
    if (_companyData == null) return;
    setState(() => _savingCnpj = true);
    try {
      await _repository.saveCnpjData(cnpj: _cnpjController.text.trim(), companyData: _companyData!);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('CNPJ enviado para análise!')));
      }
    } finally {
      if (mounted) setState(() => _savingCnpj = false);
    }
  }

  Future<void> _pickIdentityDoc() async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (file != null) setState(() => _identityFile = file);
  }

  Future<void> _uploadIdentityDoc() async {
    if (_identityFile == null) return;
    setState(() => _uploadingIdentity = true);
    try {
      final bytes = await _identityFile!.readAsBytes();
      final url = await _storage.uploadBytes(Uint8List.fromList(bytes), fileName: _identityFile!.name);
      await _repository.saveIdentityDocument(widget.providerId, url);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Documento enviado!')));
      }
    } finally {
      if (mounted) setState(() => _uploadingIdentity = false);
    }
  }

  Future<void> _saveVehicleType() async {
    final type = _vehicleTypeController.text.trim();
    if (type.isEmpty) return;
    setState(() => _savingVehicleType = true);
    try {
      await _repository.saveCrlvVehicleType(widget.providerId, type);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Tipo de veículo salvo!')));
      }
    } finally {
      if (mounted) setState(() => _savingVehicleType = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('CNPJ e documentos')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text('Pessoa Jurídica (CNPJ)', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _cnpjController,
                  decoration: const InputDecoration(labelText: 'CNPJ'),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: _validating ? null : _validateCnpj,
                child: Text(_validating ? '...' : 'Validar'),
              ),
            ],
          ),
          if (_cnpjError != null) ...[
            const SizedBox(height: 8),
            Text(_cnpjError!, style: TextStyle(color: AppColors.destructive)),
          ],
          if (_companyData != null) ...[
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_companyData!['razao_social'] as String? ?? ''),
                    Text('${_companyData!['cidade'] ?? ''} - ${_companyData!['uf'] ?? ''}'),
                    const SizedBox(height: 8),
                    ElevatedButton(
                      onPressed: _savingCnpj ? null : _saveCnpj,
                      child: Text(_savingCnpj ? 'Enviando…' : 'Confirmar e enviar'),
                    ),
                  ],
                ),
              ),
            ),
          ],
          const Divider(height: 48),
          Text('Documento de identificação', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: _pickIdentityDoc,
            child: Text(_identityFile == null ? 'Escolher documento' : 'Documento selecionado'),
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: _identityFile == null || _uploadingIdentity ? null : _uploadIdentityDoc,
            child: Text(_uploadingIdentity ? 'Enviando…' : 'Enviar documento'),
          ),
          const Divider(height: 48),
          Text('Veículo (reboque)', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _vehicleTypeController,
                  decoration: const InputDecoration(labelText: 'Tipo de veículo (CRLV)'),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: _savingVehicleType ? null : _saveVehicleType,
                child: Text(_savingVehicleType ? '...' : 'Salvar'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
