import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      service_id,
      client_email,
      service_number,
      client_name,
      provider_name,
      items,
      extra_total,
      new_total,
      notes,
    } = await req.json();

    if (!client_email || !items) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Busca o cliente via User entity para pegar o client_id
    let clientId = null;
    try {
      const users = await base44.entities.User.filter({ email: client_email }, '', 1);
      if (users[0]?.id) {
        const clients = await base44.entities.Client.filter({ user_id: users[0].id }, '', 1);
        clientId = clients[0]?.id || null;
      }
    } catch (e) {
      console.warn('[notifyExtraChargesApproval] Could not fetch client_id:', e.message);
    }

    // Formata itens para exibição
    const itemsList = items
      .map(item => `  • ${item.description}: ${item.quantity} ${item.unit} × R$ ${item.price.toFixed(2)} = R$ ${(item.quantity * item.price).toFixed(2)}`)
      .join('\n');

    const emailBody = `
Olá ${client_name}!

O prestador ${provider_name} solicita aprovação de orçamento extra para o serviço #${service_number}.

📋 **ITENS ADICIONAIS:**
${itemsList}

💰 **RESUMO FINANCEIRO:**
• Orçamento original: R$ ${(new_total - extra_total).toFixed(2)}
• Itens extras: R$ ${extra_total.toFixed(2)}
• Novo total: R$ ${new_total.toFixed(2)}

${notes ? `📝 **OBSERVAÇÕES DO PRESTADOR:**\n${notes}\n` : ''}

Clique no link abaixo para aprovar ou rejeitar o orçamento extra:
https://seu-app.com/acompanhar/${service_id}

Se tiver dúvidas, entre em contato diretamente com ${provider_name}.

Obrigado!
Equipe Prática
    `;

    // Envia email
    await base44.integrations.Core.SendEmail({
      to: client_email,
      subject: `Aprovação de Orçamento Extra - Serviço #${service_number}`,
      body: emailBody,
      from_name: 'Escola Prática',
    });

    // Cria notificação in-app
    if (clientId && service_id) {
      try {
        await base44.entities.ClientNotification.create({
          client_id: clientId,
          client_email,
          type: 'extra_charges_pending',
          service_id: service_id,
          service_number: service_number || '',
          provider_name: provider_name || '',
          extra_total: extra_total || 0,
          new_total: new_total || 0,
          title: `Orçamento Extra de R$ ${(extra_total || 0).toFixed(2)}`,
          message: `${provider_name || 'Prestador'} solicitou aprovação para itens adicionais`,
          is_read: false,
        });
      } catch (e) {
        console.warn('[notifyExtraChargesApproval] Failed to create in-app notification:', e.message);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[notifyExtraChargesApproval]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});