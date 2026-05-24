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
      .select('*')
      .eq('id', serviceRequestId)
      .maybeSingle();

    if (sErr) throw sErr;
    if (!serviceRequest?.final_price) {
      return jsonResponse({ error: 'Service request or price not found' }, 404);
    }
    if (!serviceRequest.provider_id) {
      return jsonResponse({ error: 'No provider assigned to this service' }, 400);
    }

    const { data: pricingRows } = await supabase
      .from('service_pricing')
      .select('*')
      .eq('service_type', serviceRequest.service_type)
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

    await supabase.from('service_requests').update({
      payment_status: 'processed',
      provider_payout_amount: providerAmount,
      platform_fee: platformFee,
      payout_processed_at: new Date().toISOString(),
    }).eq('id', serviceRequestId);

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
