import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PRESTADOR_BONUS_META = 5;
const PRESTADOR_BONUS_VALOR = 20;
const PRESTADOR_BONUS_AVALIACAO = 10;
const CASHBACK_EXPIRY_DAYS = 90;

// Fallbacks caso não haja config no banco
const NIVEIS_CLIENTE_DEFAULT = [
  { nivel: 'Iniciante',  min_amigos: 0,  bonus_fixo: 2.50, percent_take: 6.9  },
  { nivel: 'Pro',        min_amigos: 10, bonus_fixo: 3.50, percent_take: 9.7  },
  { nivel: 'Elite',      min_amigos: 20, bonus_fixo: 4.50, percent_take: 12.5 },
  { nivel: 'Lendário',   min_amigos: 35, bonus_fixo: 5.50, percent_take: 15.2 },
  { nivel: 'Imperador',  min_amigos: 50, bonus_fixo: 7.00, percent_take: 19.4 },
];

const NIVEIS_PRESTADOR_DEFAULT = [
  { nivel: 'Rubi',     min_jobs: 220, min_rating: 4.5, bonus_fixo: 5.00 },
  { nivel: 'Diamante', min_jobs: 190, min_rating: 4.0, bonus_fixo: 4.00 },
  { nivel: 'Ouro',     min_jobs: 160, min_rating: 4.0, bonus_fixo: 3.50 },
  { nivel: 'Prata',    min_jobs: 120, min_rating: 4.0, bonus_fixo: 3.00 },
];

function getNivelPrestador(totalJobs, rating, niveis) {
  const sorted = [...niveis].sort((a, b) => b.min_jobs - a.min_jobs);
  for (const lvl of sorted) {
    if (totalJobs >= (lvl.min_jobs || 0) && rating >= (lvl.min_rating || 0)) return lvl;
  }
  return null;
}

function getNivelCliente(amigosAtivos, niveis) {
  const sorted = [...niveis].sort((a, b) => b.min_amigos - a.min_amigos);
  for (const lvl of sorted) {
    if (amigosAtivos >= (lvl.min_amigos || 0)) return lvl;
  }
  return niveis[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Suporta chamada manual ({ request_id }) e automação de entidade ({ event, data })
    let serviceRequest;
    if (body.event?.entity_id) {
      serviceRequest = body.data || await base44.asServiceRole.entities.ServiceRequest.get(body.event.entity_id);
    } else if (body.request_id) {
      serviceRequest = await base44.asServiceRole.entities.ServiceRequest.get(body.request_id);
    }

    if (!serviceRequest) {
      return Response.json({ error: 'Service request not found' }, { status: 404 });
    }
    if (serviceRequest.status !== 'concluido') {
      return Response.json({ error: 'Service not completed' }, { status: 400 });
    }

    // Evita duplicatas: verifica se já existe cashback para este serviço e prestador
    if (serviceRequest.provider_id) {
      const existing = await base44.asServiceRole.entities.Cashback.filter({
        service_request_id: serviceRequest.id,
        owner_type: 'prestador',
      });
      if (existing.length > 0) {
        console.log(`[processCashback] Cashback já gerado para OS ${serviceRequest.id}, ignorando.`);
        return Response.json({ success: true, skipped: true });
      }
    }

    const request_id = serviceRequest.id;
    const finalPrice = serviceRequest.final_price || 0;
    const expiresAt = new Date(Date.now() + CASHBACK_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const results = [];

    // Busca configurações do banco (CashbackConfig)
    const allConfigs = await base44.asServiceRole.entities.CashbackConfig.filter({ is_active: true }).catch(() => []);
    const configsPrestador = allConfigs.filter(c => c.owner_type === 'prestador');
    const configsCliente = allConfigs.filter(c => c.owner_type === 'cliente');
    const niveisPrestador = configsPrestador.length > 0 ? configsPrestador : NIVEIS_PRESTADOR_DEFAULT;
    const niveisCliente = configsCliente.length > 0 ? configsCliente : NIVEIS_CLIENTE_DEFAULT;

    // ── CASHBACK CLIENTE (baseado em amigos indicados ativos) ──
    if (serviceRequest.client_id) {
      // Busca indicações confirmadas do cliente (amigos ativos = que já fizeram ao menos 1 serviço)
      const referrals = await base44.asServiceRole.entities.Referral.filter({
        referrer_id: serviceRequest.client_id,
        reward_status: 'confirmada',
      });
      const amigosAtivos = referrals.length;
      const nivel = getNivelCliente(amigosAtivos, niveisCliente);

      // Cashback = bônus fixo por serviço do nível + % do take sobre o valor do serviço
      const bonusFixo = nivel.bonus_fixo || nivel.bonusPorServico || 0;
      const percentTake = nivel.percent_take || nivel.percentTake || 0;
      const bonusPercent = finalPrice > 0 ? parseFloat((finalPrice * percentTake / 100).toFixed(2)) : 0;
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
        reason: `🏅 Nível ${nivel.nivel} · R$ ${bonusFixo.toFixed(2)} fixo + ${percentTake}% do take (${amigosAtivos} amigos ativos)`,
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

      // Bônus de nível por serviço concluído
      const providerEntity = await base44.asServiceRole.entities.Provider.get(serviceRequest.provider_id).catch(() => null);
      if (providerEntity) {
        const nivelPrestador = getNivelPrestador(providerEntity.total_jobs || 0, providerEntity.rating || 0, niveisPrestador);
        if (nivelPrestador) {
          await base44.asServiceRole.entities.Cashback.create({
            owner_id: serviceRequest.provider_id,
            owner_type: 'prestador',
            owner_name: serviceRequest.provider_name,
            service_request_id: request_id,
            service_type: serviceRequest.service_type,
            service_value: finalPrice,
            cashback_amount: nivelPrestador.bonus_fixo || nivelPrestador.bonus || 0,
            cashback_percent: 0,
            reason: `${nivelPrestador.label || nivelPrestador.nivel} · bônus por nível (R$ ${(nivelPrestador.bonus_fixo || nivelPrestador.bonus || 0).toFixed(2)}/serviço)`,
            status: 'disponivel',
            expires_at: expiresAt,
          });
          results.push({ type: 'prestador_nivel', nivel: nivelPrestador.key, amount: nivelPrestador.bonus });
          console.log(`[cashback] Prestador ${serviceRequest.provider_name} (${nivelPrestador.label}): +R$ ${nivelPrestador.bonus}`);
        }
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