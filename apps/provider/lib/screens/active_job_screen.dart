import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:reparo_shared/reparo_shared.dart';
import 'package:url_launcher/url_launcher.dart';

const _declineReasons = [
  'Fora da área de atendimento',
  'Já tenho outro compromisso',
  'Falta de material/peça',
  'Endereço inválido',
];

const _checklistItems = [
  'Local limpo e organizado',
  'Peças originais utilizadas',
  'Teste de funcionamento realizado',
  'Cliente orientado sobre garantia',
];

/// Porta de `legacy/src/components/ActiveJobCard.jsx`: progressão de
/// status, link pro mapa nativo (sem API key), recusa com motivo + foto,
/// checklist de conclusão (itens fixos — `ChecklistsAdmin.jsx` permitiria
/// configurar por serviço, mas não existe tabela pra isso no schema ainda,
/// ver /MIGRATION.md), envio de orçamento extra, e chat. Assinatura
/// digital do cliente ficou de fora — não existe coluna no schema pra
/// guardar isso e não quis inventar uma sem confirmar com você.
class ActiveJobScreen extends StatefulWidget {
  const ActiveJobScreen({super.key, required this.job});

  final ServiceRequest job;

  @override
  State<ActiveJobScreen> createState() => _ActiveJobScreenState();
}

class _ActiveJobScreenState extends State<ActiveJobScreen> {
  final _chatRepository = ChatRepository(ReparoSupabase.client);
  final _messageController = TextEditingController();
  late ServiceRequestStatus _status = widget.job.status;
  bool _updating = false;
  bool _declined = false;
  late final Map<String, bool> _checklist = {
    for (final item in _checklistItems) item: (widget.job.checklist?[item] as bool?) ?? false,
  };
  bool _sendingExtraCharges = false;

  static const _nextStatus = {
    ServiceRequestStatus.aceito: ServiceRequestStatus.aCaminho,
    ServiceRequestStatus.aCaminho: ServiceRequestStatus.emAndamento,
    ServiceRequestStatus.emAndamento: ServiceRequestStatus.concluido,
  };

  static const _nextLabel = {
    ServiceRequestStatus.aceito: 'Iniciar deslocamento',
    ServiceRequestStatus.aCaminho: 'Cheguei — iniciar serviço',
    ServiceRequestStatus.emAndamento: 'Concluir serviço',
  };

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _advance() async {
    final next = _nextStatus[_status];
    if (next == null) return;
    setState(() => _updating = true);
    try {
      await ServiceRequestRepository(ReparoSupabase.client).updateStatus(widget.job.id, next);
      setState(() => _status = next);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Status: ${next.label}')));
      }
    } finally {
      if (mounted) setState(() => _updating = false);
    }
  }

  Future<void> _send() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;
    _messageController.clear();
    await _chatRepository.send(
      requestId: widget.job.id,
      text: text,
      senderRole: 'provider',
    );
  }

  Future<void> _toggleChecklistItem(String item, bool value) async {
    setState(() => _checklist[item] = value);
    await ReparoSupabase.client
        .from('service_requests')
        .update({'checklist': _checklist}).eq('id', widget.job.id);
  }

  Future<void> _openExtraChargesDialog() async {
    final providerId = widget.job.providerId;
    if (providerId == null) return;
    final materialController = TextEditingController();
    final laborController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Solicitar orçamento extra'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: materialController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Total de materiais (R\$)'),
            ),
            TextField(
              controller: laborController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Mão de obra extra (R\$, opcional)'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Enviar')),
        ],
      ),
    );

    final material = num.tryParse(materialController.text);
    if (confirmed != true || material == null) return;

    final labor = num.tryParse(laborController.text) ?? 0;
    final total = material + labor;
    final currentPrice = widget.job.estimatedPrice ?? widget.job.clientSuggestedPrice ?? 0;

    setState(() => _sendingExtraCharges = true);
    try {
      await ServiceRequestRepository(ReparoSupabase.client).sendExtraChargesRequest(
        serviceId: widget.job.id,
        providerId: providerId,
        providerName: widget.job.providerName ?? '',
        materialTotal: material,
        laborTotal: labor,
        extraChargesTotal: total,
        newTotal: currentPrice + total,
      );
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Orçamento extra enviado ao cliente!')));
      }
    } finally {
      if (mounted) setState(() => _sendingExtraCharges = false);
    }
  }

  Future<void> _openMap() async {
    final job = widget.job;
    final query = job.latitude != null && job.longitude != null
        ? '${job.latitude},${job.longitude}'
        : [job.address, job.neighborhood, job.city, job.state].nonNulls.join(', ');
    final uri = Uri.parse('https://maps.apple.com/?q=${Uri.encodeComponent(query)}');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _openDeclineDialog() async {
    final providerId = widget.job.providerId;
    if (providerId == null) return;

    final reasons = <String>{};
    final descriptionController = TextEditingController();
    final photos = <XFile>[];

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Recusar chamado'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ..._declineReasons.map((reason) => CheckboxListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      value: reasons.contains(reason),
                      title: Text(reason),
                      onChanged: (v) => setDialogState(() {
                        if (v == true) {
                          reasons.add(reason);
                        } else {
                          reasons.remove(reason);
                        }
                      }),
                    )),
                TextField(
                  controller: descriptionController,
                  decoration: const InputDecoration(labelText: 'Descreva o motivo'),
                  maxLines: 2,
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: [
                    ...photos.map((p) => Chip(label: Text(p.name))),
                    ActionChip(
                      avatar: const Icon(Icons.add_a_photo, size: 18),
                      label: const Text('Foto de evidência'),
                      onPressed: () async {
                        final file = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 80);
                        if (file != null) setDialogState(() => photos.add(file));
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
            FilledButton(
              onPressed: (reasons.isNotEmpty && descriptionController.text.trim().isNotEmpty && photos.isNotEmpty)
                  ? () => Navigator.pop(context, true)
                  : null,
              child: const Text('Confirmar recusa'),
            ),
          ],
        ),
      ),
    );

    if (confirmed != true) return;

    setState(() => _updating = true);
    try {
      final storage = StorageRepository(ReparoSupabase.client);
      final photoUrls = <String>[];
      for (final photo in photos) {
        final bytes = await photo.readAsBytes();
        photoUrls.add(await storage.uploadBytes(Uint8List.fromList(bytes), fileName: photo.name));
      }
      await ServiceRequestRepository(ReparoSupabase.client).declineJob(
        requestId: widget.job.id,
        providerId: providerId,
        reasons: reasons.toList(),
        description: descriptionController.text.trim(),
        photos: photoUrls,
      );
      if (mounted) setState(() => _declined = true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Não foi possível recusar. Tente novamente.')));
      }
    } finally {
      if (mounted) setState(() => _updating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final job = widget.job;
    final nextLabel = _nextLabel[_status];
    final canDecline = !_declined && (_status == ServiceRequestStatus.aceito || _status == ServiceRequestStatus.aCaminho);

    if (_declined) {
      return Scaffold(
        appBar: AppBar(title: Text(job.serviceLabel)),
        body: const Center(child: Text('Chamado recusado. Ele volta para a fila de outro prestador.')),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text(job.serviceLabel)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Chip(label: Text(_status.label)),
                    const Spacer(),
                    if (job.clientPhone != null)
                      Text(job.clientPhone!, style: Theme.of(context).textTheme.bodyMedium),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(child: Text([job.address, job.neighborhood, job.city].nonNulls.join(', '))),
                    IconButton(icon: const Icon(Icons.map), tooltip: 'Ver no mapa', onPressed: _openMap),
                  ],
                ),
                if (job.description != null) ...[
                  const SizedBox(height: 8),
                  Text(job.description!),
                ],
                const SizedBox(height: 16),
                Row(
                  children: [
                    if (nextLabel != null)
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _updating ? null : _advance,
                          child: Text(_updating ? 'Atualizando…' : nextLabel),
                        ),
                      )
                    else if (_status == ServiceRequestStatus.concluido)
                      const Expanded(child: Text('Serviço concluído ✅')),
                    if (canDecline) ...[
                      const SizedBox(width: 8),
                      OutlinedButton(
                        onPressed: _updating ? null : _openDeclineDialog,
                        child: const Text('Recusar'),
                      ),
                    ],
                  ],
                ),
                if (_status == ServiceRequestStatus.emAndamento) ...[
                  const Divider(height: 24),
                  Text('Checklist de conclusão', style: Theme.of(context).textTheme.titleSmall),
                  ..._checklistItems.map(
                    (item) => CheckboxListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      value: _checklist[item],
                      title: Text(item),
                      onChanged: (v) => _toggleChecklistItem(item, v ?? false),
                    ),
                  ),
                  OutlinedButton(
                    onPressed: _sendingExtraCharges ? null : _openExtraChargesDialog,
                    child: Text(_sendingExtraCharges ? 'Enviando…' : 'Solicitar orçamento extra'),
                  ),
                ],
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: StreamBuilder<List<ChatMessage>>(
              stream: _chatRepository.watch(job.id),
              builder: (context, snapshot) {
                final messages = snapshot.data ?? const [];
                if (messages.isEmpty) {
                  return const Center(child: Text('Nenhuma mensagem ainda.'));
                }
                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final message = messages[index];
                    final isMe = message.senderRole == 'provider';
                    return Align(
                      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: isMe ? AppColors.primary.withValues(alpha: 0.2) : AppColors.card,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(message.text),
                      ),
                    );
                  },
                );
              },
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      decoration: const InputDecoration(hintText: 'Escreva uma mensagem…'),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  IconButton(icon: const Icon(Icons.send), onPressed: _send),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
