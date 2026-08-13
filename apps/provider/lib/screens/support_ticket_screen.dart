import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:reparo_shared/reparo_shared.dart';

const _ticketTypes = [
  ('pagamento', 'Pagamento'),
  ('cliente', 'Cliente'),
  ('sistema', 'Sistema'),
  ('documentacao', 'Documentação'),
];

/// Porta de `legacy/src/components/ProviderTicketForm.jsx`. RLS corrigida
/// na Fase 6 estendida (`20260601150000_tickets_owner_access.sql`).
class SupportTicketScreen extends StatefulWidget {
  const SupportTicketScreen({super.key, required this.providerId});

  final String providerId;

  @override
  State<SupportTicketScreen> createState() => _SupportTicketScreenState();
}

class _SupportTicketScreenState extends State<SupportTicketScreen> {
  final _subjectController = TextEditingController();
  final _messageController = TextEditingController();
  String _type = _ticketTypes.first.$1;
  bool _submitting = false;

  @override
  void dispose() {
    _subjectController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_subjectController.text.trim().isEmpty || _messageController.text.trim().isEmpty) return;
    setState(() => _submitting = true);
    try {
      await TicketRepository(ReparoSupabase.client).createMine(
        type: _type,
        subject: _subjectController.text.trim(),
        message: _messageController.text.trim(),
        providerId: widget.providerId,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Chamado aberto!')));
      context.pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Não foi possível abrir o chamado.')));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Abrir chamado')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DropdownButtonFormField<String>(
              initialValue: _type,
              decoration: const InputDecoration(labelText: 'Categoria'),
              items: _ticketTypes.map((t) => DropdownMenuItem(value: t.$1, child: Text(t.$2))).toList(),
              onChanged: (v) => setState(() => _type = v ?? _type),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _subjectController,
              decoration: const InputDecoration(labelText: 'Assunto'),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _messageController,
              maxLines: 5,
              decoration: const InputDecoration(labelText: 'Descreva o problema', alignLabelWithHint: true),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _submitting ? null : _submit,
              child: Text(_submitting ? 'Enviando…' : 'Enviar'),
            ),
          ],
        ),
      ),
    );
  }
}
