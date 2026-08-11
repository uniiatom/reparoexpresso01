import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { serviceRequestId } = await req.json();

    if (!serviceRequestId) {
      return Response.json({ error: 'Missing serviceRequestId' }, { status: 400 });
    }

    // Fetch service request
    const requests = await base44.asServiceRole.entities.ServiceRequest.filter({ id: serviceRequestId });
    const serviceRequest = requests[0];

    if (!serviceRequest || !serviceRequest.final_price) {
      return Response.json({ error: 'Service request or price not found' }, { status: 404 });
    }

    if (!serviceRequest.provider_id) {
      return Response.json({ error: 'No provider assigned to this service' }, { status: 400 });
    }

    // Fetch service pricing to determine repayment
    const pricing = await base44.asServiceRole.entities.ServicePricing.filter({ 
      service_type: serviceRequest.service_type 
    });

    const priceConfig = pricing[0];
    let providerAmount = 0;
    let platformFee = 0;

    if (priceConfig?.repasse_percent) {
      // Percentage-based repayment
      providerAmount = serviceRequest.final_price * (priceConfig.repasse_percent / 100);
      platformFee = serviceRequest.final_price - providerAmount;
    } else if (priceConfig?.repasse_value) {
      // Fixed amount repayment
      providerAmount = priceConfig.repasse_value;
      platformFee = serviceRequest.final_price - providerAmount;
    } else {
      // Default: 70% to provider, 30% platform
      providerAmount = serviceRequest.final_price * 0.7;
      platformFee = serviceRequest.final_price * 0.3;
    }

    // Update service request with payment distribution
    await base44.asServiceRole.entities.ServiceRequest.update(serviceRequestId, {
      payment_status: 'processed',
      provider_payout_amount: providerAmount,
      platform_fee: platformFee,
      payout_processed_at: new Date().toISOString(),
    });

    console.log(`[Provider Repayment] Service ${serviceRequestId}: Total R$${serviceRequest.final_price.toFixed(2)} → Provider R$${providerAmount.toFixed(2)} + Platform R$${platformFee.toFixed(2)}`);

    return Response.json({
      success: true,
      serviceRequestId,
      total_amount: serviceRequest.final_price,
      provider_amount: providerAmount,
      platform_fee: platformFee,
      provider_id: serviceRequest.provider_id,
    });

  } catch (error) {
    console.error('[Provider Repayment Error]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});