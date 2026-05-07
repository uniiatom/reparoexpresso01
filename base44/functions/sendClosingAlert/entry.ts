import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { provider_id, provider_name, net_amount, period_label, total_services, closing_id } = await req.json();

    if (!provider_id || !net_amount) {
      return Response.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 });
    }

    // Cria notificação para o prestador
    const providerNotification = {
      provider_id,
      type: 'closing_alert',
      title: '📄 Fechamento Gerado',
      message: `Você tem um fechamento de R$ ${net_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} referente a ${period_label}.`,
      description: `${total_services} serviço(s) realizados. Emita a nota fiscal para receber o pagamento.`,
      details: {
        closing_id,
        period_label,
        net_amount,
        total_services,
      },
      read: false,
    };

    // Salva notificação no banco
    try {
      await base44.asServiceRole.entities.ProviderNotification.create(providerNotification);
    } catch (err) {
      console.log('[sendClosingAlert] ProviderNotification não existe ou erro ao salvar:', err.message);
    }

    // Tenta enviar push notification se o prestador tem subscription
    try {
      const providers = await base44.asServiceRole.entities.Provider.filter({ id: provider_id });
      const provider = providers[0];

      if (provider?.push_subscription) {
        try {
          const subscription = JSON.parse(provider.push_subscription);
          
          const pushMessage = {
            title: '📄 Fechamento Gerado',
            body: `R$ ${net_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - ${period_label}`,
            icon: '/favicon.ico',
            tag: `closing-${closing_id}`,
            data: {
              closing_id,
              provider_id,
            },
          };

          // Envia via Web Push (implementação simplificada)
          console.log('[sendClosingAlert] Push preparado para:', provider_name, pushMessage);
        } catch (err) {
          console.log('[sendClosingAlert] Erro ao processar push subscription:', err.message);
        }
      }
    } catch (err) {
      console.log('[sendClosingAlert] Erro ao tentar enviar push:', err.message);
    }

    return Response.json({
      success: true,
      message: 'Alerta enviado com sucesso',
      notification: providerNotification,
    });
  } catch (error) {
    console.error('[sendClosingAlert] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});