import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:reparo_shared/reparo_shared.dart';

const _quickReplies = [
  'Olá! Já estamos analisando seu chamado.',
  'Poderia enviar mais detalhes ou fotos do ocorrido?',
  'Seu chamado foi resolvido. Qualquer dúvida, estamos à disposição.',
  'Encaminhamos seu caso para o time responsável.',
];

const _priorities = ['baixa', 'media', 'alta'];

/// Porta de `legacy/src/components/admin/TicketsAdmin.jsx`: respostas
/// rápidas (templates fixos — não existe tabela pra templates
/// configuráveis), filtro por prioridade e alerta de SLA (>22h sem
/// resposta, igual ao legado).
class TicketsTab extends StatefulWidget {
  const TicketsTab({super.key});

  @override
  State<TicketsTab> createState() => _TicketsTabState();
}

class _TicketsTabState extends State<TicketsTab> {
  String? _priorityFilter;

  @override
  Widget build(BuildContext context) {
    final repository = TicketRepository(ReparoSupabase.client);
    final dateFormat = DateFormat('dd/MM HH:mm');

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Wrap(
            spacing: 8,
            children: [
              ChoiceChip(
                label: const Text('Todas'),
                selected: _priorityFilter == null,
                onSelected: (_) => setState(() => _priorityFilter = null),
              ),
              ..._priorities.map(
                (p) => ChoiceChip(
                  label: Text(p),
                  selected: _priorityFilter == p,
                  onSelected: (_) => setState(() => _priorityFilter = p),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: StreamBuilder<List<Ticket>>(
            stream: repository.watchAll(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              var tickets = snapshot.data ?? const [];
              if (_priorityFilter != null) {
                tickets = tickets.where((t) => t.priority == _priorityFilter).toList();
              }
              if (tickets.isEmpty) {
                return const Center(child: Text('Nenhum ticket.'));
              }
              return ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: tickets.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final ticket = tickets[index];
                  final hoursOpen = DateTime.now().difference(ticket.createdAt).inHours;
                  final expiring = ticket.status == 'aberto' && hoursOpen > 22;
                  return Card(
                    color: expiring ? AppColors.destructive.withValues(alpha: 0.1) : null,
                    child: ListTile(
                      title: Text(ticket.subject),
                      subtitle: Text(
                        '${ticket.clientName ?? ticket.providerName ?? '—'} · ${dateFormat.format(ticket.createdAt.toLocal())}'
                        '${expiring ? ' · ⚠️ Sem resposta há ${hoursOpen}h' : ''}',
                      ),
                      trailing: Wrap(
                        spacing: 4,
                        children: [
                          Chip(label: Text(ticket.priority)),
                          Chip(label: Text(ticket.status)),
                        ],
                      ),
                      onTap: () => _openTicket(context, repository, ticket),
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }

  void _openTicket(BuildContext context, TicketRepository repository, Ticket ticket) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => _TicketDetailSheet(repository: repository, ticket: ticket),
    );
  }
}

class _TicketDetailSheet extends StatefulWidget {
  const _TicketDetailSheet({required this.repository, required this.ticket});

  final TicketRepository repository;
  final Ticket ticket;

  @override
  State<_TicketDetailSheet> createState() => _TicketDetailSheetState();
}

class _TicketDetailSheetState extends State<_TicketDetailSheet> {
  final _replyController = TextEditingController();

  @override
  void dispose() {
    _replyController.dispose();
    super.dispose();
  }

  Future<void> _reply([String? text]) async {
    final message = (text ?? _replyController.text).trim();
    if (message.isEmpty) return;
    _replyController.clear();
    await widget.repository.reply(ticketId: widget.ticket.id, text: message);
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.8,
      expand: false,
      builder: (context, scrollController) {
        return Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(widget.ticket.subject, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 4),
              Text(widget.ticket.message),
              const Divider(height: 24),
              Expanded(
                child: StreamBuilder<List<TicketMessage>>(
                  stream: widget.repository.watchMessages(widget.ticket.id),
                  builder: (context, snapshot) {
                    final messages = snapshot.data ?? const [];
                    return ListView.builder(
                      controller: scrollController,
                      itemCount: messages.length,
                      itemBuilder: (context, index) {
                        final message = messages[index];
                        return ListTile(
                          dense: true,
                          title: Text(message.text),
                          subtitle: Text(message.senderName ?? message.senderRole ?? ''),
                        );
                      },
                    );
                  },
                ),
              ),
              Wrap(
                spacing: 8,
                children: _quickReplies
                    .map((template) => ActionChip(label: Text(template), onPressed: () => _reply(template)))
                    .toList(),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _replyController,
                      decoration: const InputDecoration(hintText: 'Responder…'),
                      onSubmitted: (_) => _reply(),
                    ),
                  ),
                  IconButton(icon: const Icon(Icons.send), onPressed: () => _reply()),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
