import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:reparo_shared/reparo_shared.dart';

const _timeline = [
  ServiceRequestStatus.aguardando,
  ServiceRequestStatus.aceito,
  ServiceRequestStatus.aCaminho,
  ServiceRequestStatus.emAndamento,
  ServiceRequestStatus.concluido,
];

/// Porta de `legacy/src/pages/AcompanharServico.jsx`: status, chat em
/// tempo real, avaliação pós-serviço, aprovação de orçamento extra e
/// garantia (com solicitação de retorno). Sem mapa de rastreamento ao vivo
/// ainda — ver Fase 3 em /MIGRATION.md.
class OrderDetailScreen extends StatefulWidget {
  const OrderDetailScreen({super.key, required this.order});

  final ServiceRequest order;

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  final _chatRepository = ChatRepository(ReparoSupabase.client);
  final _messageController = TextEditingController();
  bool _ratingSubmitted = false;
  bool _decidingExtraCharges = false;
  Map<String, dynamic>? _extraCharges;

  @override
  void initState() {
    super.initState();
    _ratingSubmitted = widget.order.ratingClient != null;
    _extraCharges = widget.order.extraCharges;
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;
    _messageController.clear();
    await _chatRepository.send(requestId: widget.order.id, text: text, senderRole: 'user');
  }

  Future<void> _openRatingSheet() async {
    final rated = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _RatingSheet(order: widget.order),
    );
    if (rated == true && mounted) setState(() => _ratingSubmitted = true);
  }

  Future<void> _decideExtraCharges(bool approve) async {
    final charges = _extraCharges;
    if (charges == null) return;
    setState(() => _decidingExtraCharges = true);
    final repository = ServiceRequestRepository(ReparoSupabase.client);
    try {
      if (approve) {
        await repository.approveExtraCharges(
          serviceId: widget.order.id,
          providerId: charges['provider_id'] as String? ?? widget.order.providerId ?? '',
          extraChargesTotal: (charges['extra_charges_total'] as num?) ?? 0,
          newTotal: (charges['new_total'] as num?) ?? 0,
        );
      } else {
        await repository.rejectExtraCharges(
          serviceId: widget.order.id,
          providerId: charges['provider_id'] as String? ?? widget.order.providerId ?? '',
          rejectionNotes: 'Cliente não aprovou o orçamento extra.',
        );
      }
      if (mounted) {
        setState(() => _extraCharges = {...charges, 'status': approve ? 'approved' : 'rejected'});
      }
    } finally {
      if (mounted) setState(() => _decidingExtraCharges = false);
    }
  }

  Future<void> _requestReturn() async {
    final order = widget.order;
    await ServiceRequestRepository(ReparoSupabase.client).createDraft(
      professionId: order.professionId,
      subServiceId: order.subServiceId,
      description: 'Retorno de garantia da OS ${order.serviceNumber ?? order.id}',
      address: order.address,
      neighborhood: order.neighborhood,
      city: order.city,
      state: order.state,
      urgency: 'hoje',
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('Solicitação de retorno enviada!')));
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final order = widget.order;
    final currentIndex = _timeline.indexOf(order.status);

    return Scaffold(
      appBar: AppBar(title: Text(order.serviceLabel)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (order.status == ServiceRequestStatus.cancelado)
                  Chip(
                    label: Text(order.status.label),
                    backgroundColor: AppColors.destructive.withValues(alpha: 0.2),
                  )
                else
                  SizedBox(
                    height: 56,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _timeline.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 4),
                      itemBuilder: (context, index) {
                        final done = currentIndex >= 0 && index <= currentIndex;
                        return Chip(
                          label: Text(_timeline[index].label),
                          backgroundColor: done ? AppColors.primary.withValues(alpha: 0.25) : null,
                        );
                      },
                    ),
                  ),
                if (order.providerName != null) ...[
                  const SizedBox(height: 8),
                  Text('Prestador: ${order.providerName}'),
                ],
                if (_extraCharges != null && _extraCharges!['status'] == 'pending') ...[
                  const SizedBox(height: 16),
                  Card(
                    color: AppColors.accent,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('O prestador solicitou um orçamento extra:'),
                          const SizedBox(height: 4),
                          Text(
                            'Novo total: R\$ ${(_extraCharges!['new_total'] as num?)?.toStringAsFixed(2) ?? '—'}',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              ElevatedButton(
                                onPressed: _decidingExtraCharges ? null : () => _decideExtraCharges(true),
                                child: const Text('Aprovar'),
                              ),
                              const SizedBox(width: 8),
                              OutlinedButton(
                                onPressed: _decidingExtraCharges ? null : () => _decideExtraCharges(false),
                                child: const Text('Recusar'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ] else if (_extraCharges != null && _extraCharges!['status'] == 'approved')
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Text('Orçamento extra aprovado.'),
                  )
                else if (_extraCharges != null && _extraCharges!['status'] == 'rejected')
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Text('Orçamento extra recusado.'),
                  ),
                if (order.status == ServiceRequestStatus.concluido &&
                    order.warrantyEndDate != null &&
                    order.warrantyEndDate!.isAfter(DateTime.now())) ...[
                  const SizedBox(height: 16),
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.verified_user),
                      title: const Text('Serviço em garantia'),
                      subtitle: Text(
                        'Válida até ${order.warrantyEndDate!.day}/${order.warrantyEndDate!.month}/${order.warrantyEndDate!.year}',
                      ),
                      trailing: TextButton(onPressed: _requestReturn, child: const Text('Solicitar retorno')),
                    ),
                  ),
                ],
                if (order.status == ServiceRequestStatus.concluido) ...[
                  const SizedBox(height: 16),
                  if (_ratingSubmitted)
                    const Text('Obrigado por avaliar! ⭐')
                  else
                    FilledButton.icon(
                      onPressed: _openRatingSheet,
                      icon: const Icon(Icons.star_outline),
                      label: const Text('Avaliar serviço'),
                    ),
                ],
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: StreamBuilder<List<ChatMessage>>(
              stream: _chatRepository.watch(order.id),
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
                    final isMe = message.senderRole == 'user';
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

/// Porta de `legacy/src/components/DetailedRatingModal.jsx`: nota geral +
/// critérios (pontualidade/qualidade/comportamento) + comentário + até 3
/// fotos. Avaliação com comentário >= 20 caracteres e ao menos 1 foto ganha
/// 50 pontos de fidelidade + badge "Avaliador de Elite" (`grantEliteBadge`).
class _RatingSheet extends StatefulWidget {
  const _RatingSheet({required this.order});

  final ServiceRequest order;

  @override
  State<_RatingSheet> createState() => _RatingSheetState();
}

class _RatingSheetState extends State<_RatingSheet> {
  int _overall = 5;
  int _punctuality = 5;
  int _quality = 5;
  int _behavior = 5;
  final _commentController = TextEditingController();
  final _photos = <XFile>[];
  bool _uploading = false;
  bool _submitting = false;

  bool get _isDetailed => _commentController.text.trim().length >= 20 && _photos.isNotEmpty;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _addPhoto() async {
    if (_photos.length >= 3) return;
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (file != null) setState(() => _photos.add(file));
  }

  Future<void> _submit() async {
    final providerId = widget.order.providerId;
    if (providerId == null) return;
    setState(() => _submitting = true);
    try {
      setState(() => _uploading = true);
      final storage = StorageRepository(ReparoSupabase.client);
      final photoUrls = <String>[];
      for (final photo in _photos) {
        final bytes = await photo.readAsBytes();
        photoUrls.add(await storage.uploadBytes(Uint8List.fromList(bytes), fileName: photo.name));
      }
      setState(() => _uploading = false);

      final isDetailed = _commentController.text.trim().length >= 20 && photoUrls.isNotEmpty;
      final comment = _commentController.text.trim().isEmpty ? null : _commentController.text.trim();

      final reviewRepository = ReviewRepository(ReparoSupabase.client);
      await reviewRepository.create(
        providerId: providerId,
        serviceRequestId: widget.order.id,
        overallRating: _overall,
        punctualityRating: _punctuality,
        qualityRating: _quality,
        behaviorRating: _behavior,
        comment: comment,
        serviceDescription: widget.order.serviceLabel,
        photos: photoUrls,
        isDetailed: isDetailed,
      );
      await ServiceRequestRepository(ReparoSupabase.client)
          .rate(widget.order.id, rating: _overall, comment: comment);
      if (isDetailed) await reviewRepository.grantEliteBadge(widget.order.id);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            isDetailed
                ? 'Avaliação enviada! Você ganhou 50 pontos + badge "Avaliador de Elite" 🏅'
                : 'Avaliação enviada, obrigado!',
          ),
        ),
      );
      Navigator.of(context).pop(true);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Widget _starRow(String label, int value, ValueChanged<int> onChanged, {double size = 28}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label),
        Row(
          children: List.generate(5, (i) {
            final starIndex = i + 1;
            return IconButton(
              iconSize: size,
              icon: Icon(
                starIndex <= value ? Icons.star : Icons.star_border,
                color: AppColors.primary,
              ),
              onPressed: () => onChanged(starIndex),
            );
          }),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Como foi o serviço?', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            _starRow('Nota geral', _overall, (v) => setState(() => _overall = v), size: 36),
            const Divider(height: 24),
            _starRow('Pontualidade', _punctuality, (v) => setState(() => _punctuality = v)),
            _starRow('Qualidade', _quality, (v) => setState(() => _quality = v)),
            _starRow('Comportamento', _behavior, (v) => setState(() => _behavior = v)),
            const SizedBox(height: 12),
            TextField(
              controller: _commentController,
              maxLength: 500,
              maxLines: 3,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                labelText: 'Comentário (opcional)',
                hintText: 'Descreva sua experiência com pelo menos 20 caracteres para ganhar pontos e a badge de Avaliador de Elite',
                border: OutlineInputBorder(),
              ),
            ),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ..._photos.map(
                  (p) => Chip(label: Text(p.name), onDeleted: () => setState(() => _photos.remove(p))),
                ),
                if (_photos.length < 3)
                  ActionChip(
                    avatar: _uploading
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.add_a_photo, size: 18),
                    label: const Text('Adicionar foto'),
                    onPressed: _uploading ? null : _addPhoto,
                  ),
              ],
            ),
            if (_isDetailed)
              const Padding(
                padding: EdgeInsets.only(top: 12),
                child: Text(
                  '🏅 Avaliação completa detectada! Você ganhará 50 pontos de fidelidade + badge "Avaliador de Elite".',
                ),
              ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _submitting ? null : _submit,
              child: Text(_submitting ? 'Enviando…' : 'Enviar avaliação'),
            ),
          ],
        ),
      ),
    );
  }
}
