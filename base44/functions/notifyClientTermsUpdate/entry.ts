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

    // Reseta o aceite dos termos para todos os clientes
    console.log(`Resetando aceite de termos para ${allClients.length} clientes`);
    const resetPromises = allClients.map(client =>
      base44.asServiceRole.entities.Client.update(client.id, {
        terms_accepted_at: null
      }).catch(err => {
        console.error(`Erro ao resetar aceite para ${client.email}:`, err);
        return null;
      })
    );

    await Promise.all(resetPromises);
    console.log(`Aceites de termos dos clientes resetados`);

    // Cria notificações in-app para cada cliente
    const notificationPromises = allClients.map(client =>
      base44.asServiceRole.entities.ClientNotification.create({
        client_id: client.id,
        client_email: client.email,
        type: 'terms_update',
        title: '📋 Termos de Serviço Atualizados',
        message: `Os Termos de Serviço foram atualizados.\n\n${change_summary || 'Clique para visualizar as mudanças.'}`,
        action_url: '/perfil'
      }).catch(err => {
        console.error(`Erro ao criar notificação para ${client.email}:`, err);
        return null;
      })
    );

    console.log(`Criando ${allClients.length} notificações in-app para clientes`);
    const results = await Promise.all(notificationPromises);
    const successCount = results.filter(r => r !== null).length;
    console.log(`${successCount} notificações criadas com sucesso para clientes`);

    // Envia emails para todos os clientes (opcional)
    const emailPromises = allClients
      .filter(c => c.email)
      .map(client =>
        base44.asServiceRole.integrations.Core.SendEmail({
          to: client.email,
          subject: '📋 Nossos Termos de Serviço foram atualizados',
          body: `Olá ${client.name},\n\nOs Termos de Serviço da plataforma foram atualizados.\n\n${change_summary || 'Acesse sua conta para visualizar as mudanças e aceitar os novos termos.'}\n\nAtenciosamente,\nEquipe Reparo Expresso`
        }).catch(err => {
          console.warn(`Erro ao enviar email para ${client.email}:`, err.message);
          return null;
        })
      );

    console.log(`Enviando emails de notificação para ${allClients.filter(c => c.email).length} clientes`);
    const emailResults = await Promise.all(emailPromises);
    const emailSuccessCount = emailResults.filter(r => r !== null).length;
    console.log(`${emailSuccessCount} emails enviados com sucesso`);

    return Response.json({
      success: true,
      notified: successCount,
      emails_sent: emailSuccessCount,
      total_clients: allClients.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in notifyClientTermsUpdate:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});