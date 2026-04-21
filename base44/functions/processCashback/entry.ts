import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Regras de cashback
const CLIENTE_CASHBACK_PERCENT = 5;    // 5% do valor do serviço para o cliente
const PRESTADOR_BONUS_META = 5;        // Bônus para cada 5 serviços concluídos
const PRESTADOR_BONUS_VALOR = 20;      // R$ 20 de bônus por meta atingida
const PRESTADOR_BONUS_AVALIACAO = 10;  // R$ 10 bônus se avaliação >= 4.5
const CASHBACK_EXPIRY_DAYS = 90;       // Cashback expira em 90 dias

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { request_id } = await req.json();

    const serviceRequest = await base44.asServiceRole.entities.ServiceRequest.get(request_id);

    if (!serviceRequest) {
      return Response.json({ error: 'Service request not found' }, { status: 404 });
    }
    if (serviceRequest.status !== 'concluido') {
      return Response.json({ error: 'Service not completed' }, { status: 400 });
    }

    const finalPrice = serviceRequest.final_price || 0;
    const expiresAt = new Date(Date.now() + CASHBACK_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const results = [];

    // ── CASHBACK CLIENTE ──
    if (serviceRequest.client_id && finalPrice > 0) {
      const cashbackValue = parseFloat((finalPrice * CLIENTE_CASHBACK_PERCENT / 100).toFixed(2));

      await base44.asServiceRole.entities.Cashback.create({
        owner_id: serviceRequest.client_id,
        owner_type: 'cliente',
        owner_name: serviceRequest.client_name,
        service_request_id: request_id,
        service_type: serviceRequest.service_type,
        service_value: finalPrice,
        cashback_amount: cashbackValue,
        cashback_percent: CLIENTE_CASHBACK_PERCENT,
        reason: `${CLIENTE_CASHBACK_PERCENT}% de cashback pelo serviço concluído`,
        status: 'disponivel',
        expires_at: expiresAt,
      });

      console.log(`[cashback] Cliente ${serviceRequest.client_name}: R$ ${cashbackValue}`);
      results.push({ type: 'cliente', amount: cashbackValue });
    }

    // ── CASHBACK PRESTADOR ──
    if (serviceRequest.provider_id) {
      const providerRequests = await base44.asServiceRole.entities.ServiceRequest.filter({
        provider_id: serviceRequest.provider_id,
        status: 'concluido',
      });

      const totalConcluidos = providerRequests.length;

      // Bônus por meta de serviços (a cada 5 concluídos)
      if (totalConcluidos % PRESTADOR_BONUS_META === 0) {
        await base44.asServiceRole.entities.Cashback.create({
          owner_id: serviceRequest.provider_id,
          owner_type: 'prestador',
          owner_name: serviceRequest.provider_name,
          service_request_id: request_id,
          service_type: serviceRequest.service_type,
          service_value: finalPrice,
          cashback_amount: PRESTADOR_BONUS_VALOR,
          cashback_percent: 0,
          reason: `🏆 Bônus por atingir ${totalConcluidos} serviços concluídos`,
          status: 'disponivel',
          expires_at: expiresAt,
        });

        console.log(`[cashback] Prestador ${serviceRequest.provider_name}: bônus meta R$ ${PRESTADOR_BONUS_VALOR}`);
        results.push({ type: 'prestador_meta', amount: PRESTADOR_BONUS_VALOR });
      }

      // Bônus por avaliação alta
      if (serviceRequest.rating_client && serviceRequest.rating_client >= 4.5) {
        await base44.asServiceRole.entities.Cashback.create({
          owner_id: serviceRequest.provider_id,
          owner_type: 'prestador',
          owner_name: serviceRequest.provider_name,
          service_request_id: request_id,
          service_type: serviceRequest.service_type,
          service_value: finalPrice,
          cashback_amount: PRESTADOR_BONUS_AVALIACAO,
          cashback_percent: 0,
          reason: `⭐ Bônus por avaliação ${serviceRequest.rating_client}/5`,
          status: 'disponivel',
          expires_at: expiresAt,
        });

        console.log(`[cashback] Prestador ${serviceRequest.provider_name}: bônus avaliação R$ ${PRESTADOR_BONUS_AVALIACAO}`);
        results.push({ type: 'prestador_avaliacao', amount: PRESTADOR_BONUS_AVALIACAO });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('[processCashback] erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});