import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireAdminOrService } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireAdminOrService(req);
    if ('error' in auth) return auth.error;

    const { serviceRequestId } = await req.json();
    if (!serviceRequestId) {
      return jsonResponse({ error: 'Missing serviceRequestId' }, 400);
    }

    const supabase = getServiceClient();
    const { data: serviceRequest, error: sErr } = await supabase
      .from('service_requests')
      .select('*, professions(name), sub_services(name)')
      .eq('id', serviceRequestId)
      .maybeSingle();

    if (sErr) throw sErr;
    if (!serviceRequest?.final_price) {
      return jsonResponse({ error: 'Service request or price not found' }, 404);
    }
    if (!serviceRequest.provider_id) {
      return jsonResponse({ error: 'No provider assigned to this service' }, 400);
    }

    // `service_pricing.service_type` ainda usa o vocabulário antigo (texto
    // livre definido pelo admin) — tenta casar pelo nome do sub-serviço ou
    // da profissão. Sem garantia de bater 1:1 (ver MIGRATION.md, decisão de
    // produto pendente sobre o vocabulário novo x antigo); cai no split
    // padrão 70/30 se não achar.
    const serviceLabel = serviceRequest.sub_services?.name ?? serviceRequest.professions?.name ?? '';
    const { data: pricingRows } = await supabase
      .from('service_pricing')
      .select('*')
      .ilike('service_type', serviceLabel)
      .limit(1);

    const priceConfig = pricingRows?.[0];
    const finalPrice = Number(serviceRequest.final_price);
    let providerAmount = 0;
    let platformFee = 0;

    if (priceConfig?.repasse_percent) {
      providerAmount = finalPrice * (Number(priceConfig.repasse_percent) / 100);
      platformFee = finalPrice - providerAmount;
    } else if (priceConfig?.repasse_value) {
      providerAmount = Number(priceConfig.repasse_value);
      platformFee = finalPrice - providerAmount;
    } else {
      providerAmount = finalPrice * 0.7;
      platformFee = finalPrice * 0.3;
    }

    // Não há coluna em `service_requests` para persistir o repasse calculado
    // aqui (payout_processed_at/provider_payout_amount/platform_fee nunca
    // existiram no schema real — ver MIGRATION.md seção 0.1). O repasse de
    // prestador de verdade é rastreado via `biweekly_closings`, não por OS
    // individual; esta function só calcula e retorna o split pro caller.

    return jsonResponse({
      success: true,
      serviceRequestId,
      total_amount: finalPrice,
      provider_amount: providerAmount,
      platform_fee: platformFee,
      provider_id: serviceRequest.provider_id,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
