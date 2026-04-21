import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Tabela de níveis de cashback do cliente (por amigos indicadores ativos)
const NIVEIS_CLIENTE = [
  { nivel: 'Iniciante',  minAmigos: 0,  maxAmigos: 9,  bonusPorServico: 2.50, percentTake: 6.9  },
  { nivel: 'Pro',        minAmigos: 10, maxAmigos: 19, bonusPorServico: 3.50, percentTake: 9.7  },
  { nivel: 'Elite',      minAmigos: 20, maxAmigos: 34, bonusPorServico: 4.50, percentTake: 12.5 },
  { nivel: 'Lendário',   minAmigos: 35, maxAmigos: 49, bonusPorServico: 5.50, percentTake: 15.2 },
  { nivel: 'Imperador',  minAmigos: 50, maxAmigos: 70, bonusPorServico: 7.00, percentTake: 19.4 },
];

const PRESTADOR_BONUS_META = 5;
const PRESTADOR_BONUS_VALOR = 20;
const PRESTADOR_BONUS_AVALIACAO = 10;
const CASHBACK_EXPIRY_DAYS = 90;

function getNivelCliente(amigosAtivos) {
  for (let i = NIVEIS_CLIENTE.length - 1; i >= 0; i--) {
    if (amigosAtivos >= NIVEIS_CLIENTE[i].minAmigos) return NIVEIS_CLIENTE[i];
  }
  return NIVEIS_CLIENTE[0];
}

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

    // ── CASHBACK CLIENTE (baseado em amigos indicados ativos) ──
    if (serviceRequest.client_id) {
      // Busca indicações confirmadas do cliente (amigos ativos = que já fizeram ao menos 1 serviço)
      const referrals = await base44.asServiceRole.entities.Referral.filter({
        referrer_id: serviceRequest.client_id,
        reward_status: 'confirmada',
      });
      const amigosAtivos = referrals.length;
      const nivel = getNivelCliente(amigosAtivos);

      // Cashback = bônus fixo por serviço do nível + % do take sobre o valor do serviço
      const bonusFixo = nivel.bonusPorServico;
      const bonusPercent = finalPrice > 0 ? parseFloat((finalPrice * nivel.percentTake / 100).toFixed(2)) : 0;
      const cashbackTotal = parseFloat((bonusFixo + bonusPercent).toFixed(2));

      await base44.asServiceRole.entities.Cashback.create({
        owner_id: serviceRequest.client_id,
        owner_type: 'cliente',
        owner_name: serviceRequest.client_name,
        service_request_id: request_id,
        service_type: serviceRequest.service_type,
        service_value: finalPrice,
        cashback_amount: cashbackTotal,
        cashback_percent: nivel.percentTake,
        reason: `🏅 Nível ${nivel.nivel} · R$ ${bonusFixo.toFixed(2)} fixo + ${nivel.percentTake}% do take (${amigosAtivos} amigos ativos)`,
        status: 'disponivel',
        expires_at: expiresAt,
      });

      console.log(`[cashback] Cliente ${serviceRequest.client_name} (${nivel.nivel}, ${amigosAtivos} amigos): R$ ${cashbackTotal}`);
      results.push({ type: 'cliente', nivel: nivel.nivel, amigosAtivos, amount: cashbackTotal });
    }

    // ── CASHBACK PRESTADOR ──
    if (serviceRequest.provider_id) {
      const providerRequests = await base44.asServiceRole.entities.ServiceRequest.filter({
        provider_id: serviceRequest.provider_id,
        status: 'concluido',
      });

      const totalConcluidos = providerRequests.length;

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
        results.push({ type: 'prestador_meta', amount: PRESTADOR_BONUS_VALOR });
      }

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
        results.push({ type: 'prestador_avaliacao', amount: PRESTADOR_BONUS_AVALIACAO });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('[processCashback] erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});