import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { terms_content, change_summary } = body;

    if (!terms_content) {
      return Response.json({ error: 'terms_content is required' }, { status: 400 });
    }

    // Busca todos os clientes cadastrados
    const allClients = await base44.asServiceRole.entities.Client.list();
    
    if (allClients.length === 0) {
      return Response.json({ success: true, notified: 0 });
    }

    // Busca emails dos clientes via User entity
    const userEmails = new Set();
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    allUsers.forEach(user => {
      if (user.email) userEmails.add(user.email);
    });

    // Monta lista de emails para notificação
    const emailsToNotify = allClients
      .filter(c => c.user_id && allUsers.find(u => u.id === c.user_id))
      .map(c => allUsers.find(u => u.id === c.user_id)?.email)
      .filter(Boolean);

    if (emailsToNotify.length === 0) {
      return Response.json({ success: true, notified: 0 });
    }

    // Envia email para cada cliente
    const emailPromises = emailsToNotify.map(email =>
      base44.integrations.Core.SendEmail({
        to: email,
        subject: '⚠️ Atualização nos Termos de Uso - Reparo Expresso',
        body: `Olá,

Informamos que os Termos de Uso do Reparo Expresso foram atualizados.

${change_summary ? `Alterações: ${change_summary}\n\n` : ''}
Pedimos que você leia novamente os novos termos antes de solicitar novos serviços.

Os termos atualizados estão disponíveis em sua conta no aplicativo.

Atenciosamente,
Equipe Reparo Expresso`
      }).catch(err => {
        console.error(`Erro ao enviar email para ${email}:`, err);
        return null;
      })
    );

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r !== null).length;

    return Response.json({
      success: true,
      notified: successCount,
      total_clients: allClients.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in notifyTermsUpdate:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});