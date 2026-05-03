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

    // Envia email para cada prestador
    const emailPromises = emailsToNotify.map(email =>
      base44.integrations.Core.SendEmail({
        to: email,
        subject: '⚠️ Atualização nos Termos de Serviço - Reparo Expresso',
        body: `Olá Prestador,

Informamos que os Termos de Serviço para Prestadores do Reparo Expresso foram atualizados.

${change_summary ? `Alterações realizadas:\n${change_summary}\n\n` : ''}
Por favor, leia atentamente os novos termos em sua conta no aplicativo.

Todos os prestadores DEVEM estar de acordo com os novos termos para continuar operando na plataforma.

Os termos atualizados estão disponíveis na seção "Minha Conta" > "Termos e Condições".

Atenciosamente,
Equipe Reparo Expresso`
      }).catch(err => {
        console.error(`Erro ao enviar email para ${email}:`, err);
        return null;
      })
    );

    console.log(`Tentando notificar ${emailsToNotify.length} prestadores`);
    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r !== null).length;
    console.log(`${successCount} emails enviados com sucesso`);

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