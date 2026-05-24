import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const { provider_id, provider_name, net_amount, period_label, total_services, closing_id } =
      await req.json();

    if (!provider_id || !net_amount) {
      return jsonResponse({ error: 'Dados obrigatórios ausentes' }, 400);
    }

    const supabase = getServiceClient();
    const formattedAmount = Number(net_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    await supabase.from('provider_notifications').insert({
      provider_id,
      type: 'closing_alert',
      title: 'Fechamento Gerado',
      message: `Você tem um fechamento de R$ ${formattedAmount} referente a ${period_label}. ${total_services || 0} serviço(s). Emita a nota fiscal para receber.`,
      action_url: closing_id ? `/prestador/fechamentos/${closing_id}` : '/prestador',
    });

    return jsonResponse({
      success: true,
      message: 'Alerta enviado com sucesso',
      provider_name,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
