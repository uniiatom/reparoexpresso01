/// Linha de `public.tickets` — porta de `TicketsAdmin.jsx` (PRD §14.1).
class Ticket {
  const Ticket({
    required this.id,
    required this.type,
    required this.subject,
    required this.message,
    required this.status,
    required this.priority,
    required this.createdAt,
    this.clientName,
    this.clientEmail,
    this.providerName,
    this.response,
  });

  final String id;
  final String type;
  final String subject;
  final String message;
  final String status; // aberto | em_atendimento | resolvido | fechado
  final String priority;
  final DateTime createdAt;
  final String? clientName;
  final String? clientEmail;
  final String? providerName;
  final String? response;

  factory Ticket.fromJson(Map<String, dynamic> json) {
    return Ticket(
      id: json['id'] as String,
      type: json['type'] as String,
      subject: json['subject'] as String,
      message: json['message'] as String,
      status: json['status'] as String? ?? 'aberto',
      priority: json['priority'] as String? ?? 'media',
      createdAt: DateTime.parse(json['created_at'] as String),
      clientName: json['client_name'] as String?,
      clientEmail: json['client_email'] as String?,
      providerName: json['provider_name'] as String?,
      response: json['response'] as String?,
    );
  }
}

/// Linha de `public.ticket_messages`.
class TicketMessage {
  const TicketMessage({
    required this.id,
    required this.ticketId,
    required this.text,
    required this.createdAt,
    this.senderRole,
    this.senderName,
  });

  final String id;
  final String ticketId;
  final String text;
  final DateTime createdAt;
  final String? senderRole;
  final String? senderName;

  factory TicketMessage.fromJson(Map<String, dynamic> json) {
    return TicketMessage(
      id: json['id'] as String,
      ticketId: json['ticket_id'] as String,
      text: json['text'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      senderRole: json['sender_role'] as String?,
      senderName: json['sender_name'] as String?,
    );
  }
}
