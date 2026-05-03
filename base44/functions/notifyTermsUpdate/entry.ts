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

    // Busca todos os prestadores cadastrados
    const allProviders = await base44.asServiceRole.entities.Provider.list();
    
    if (allProviders.length === 0) {
      return Response.json({ success: true, notified: 0 });
    }

    // Monta lista de emails dos prestadores para notificação
    const emailsToNotify = allProviders
      .filter(p => p.email)
      .map(p => p.email)
      .filter(Boolean);

    if (emailsToNotify.length === 0) {
      return Response.json({ success: true, notified: 0 });
    }

    // Reseta o aceite dos termos para todos os prestadores
    console.log(`Resetando aceite de termos para ${allProviders.length} prestadores`);
    const resetPromises = allProviders.map(provider =>
      base44.asServiceRole.entities.Provider.update(provider.id, {
        terms_accepted_at: null
      }).catch(err => {
        console.error(`Erro ao resetar aceite para ${provider.email}:`, err);
        return null;
      })
    );

    await Promise.all(resetPromises);
    console.log(`Aceites de termos resetados`);

    // Cria notificações in-app para cada prestador
    const notificationPromises = allProviders.map(provider =>
      base44.asServiceRole.entities.ProviderNotification.create({
        provider_id: provider.id,
        provider_email: provider.email,
        type: 'terms_update',
        title: '📋 Termos de Serviço Atualizados',
        message: `Os Termos de Serviço para Prestadores foram atualizados.\n\n${change_summary || 'Clique para visualizar as mudanças.'}`,
        action_url: '/prestador'
      }).catch(err => {
        console.error(`Erro ao criar notificação para ${provider.email}:`, err);
        return null;
      })
    );

    console.log(`Criando ${allProviders.length} notificações in-app`);
    const results = await Promise.all(notificationPromises);
    const successCount = results.filter(r => r !== null).length;
    console.log(`${successCount} notificações criadas com sucesso`);

    return Response.json({
      success: true,
      notified: successCount,
      total_providers: allProviders.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in notifyTermsUpdate:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});