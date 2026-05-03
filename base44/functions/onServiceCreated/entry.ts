import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function generatePassword() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function generateServiceNumber(base44) {
  const all = await base44.asServiceRole.entities.ServiceRequest.list('-created_date', 1000);
  const count = all.length;
  const padded = String(count).padStart(6, '0');
  return `ATD-${padded}`;
}

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Condicionado",
  troca_pneu: "Troca de Pneu", recarga_bateria: "Recarga Bateria",
  conserto_pneu: "Conserto Pneu", reboque: "Reboque",
  desentupimento: "Desentupimento", outros: "Outros",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    if (event?.type !== 'create') {
      return Response.json({ skipped: true });
    }

    const requestId = event.entity_id;
    if (!requestId) {
      return Response.json({ error: 'entity_id ausente' }, { status: 400 });
    }

    // Verificar se a OS já tem senhas geradas (evita duplicação por race condition)
    const existing = await base44.asServiceRole.entities.ServiceRequest.get(requestId);
    if (existing?.security_password) {
      console.log(`OS ${requestId} já tem senhas geradas, pulando.`);
      return Response.json({ skipped: true });
    }

    const securityPassword = generatePassword();
    const validationPassword = generatePassword();
    const serviceNumber = await generateServiceNumber(base44);

    await base44.asServiceRole.entities.ServiceRequest.update(requestId, {
      service_number: serviceNumber,
      security_password: securityPassword,
      validation_password: validationPassword,
      passwords_generated_at: new Date().toISOString(),
    });

    console.log(`Serviço ${serviceNumber} criado | Senha segurança: ${securityPassword} | Senha validação: ${validationPassword}`);

    // ── Envia Web Push para todos os prestadores online e aprovados ──
    try {
      const onlineProviders = await base44.asServiceRole.entities.Provider.filter({
        is_online: true,
        is_approved: true,
      });

      const serviceData = data || existing;
      const serviceLabel = SERVICE_LABELS[serviceData?.service_type] || 'Novo Serviço';
      const city = serviceData?.city ? ` em ${serviceData.city}` : '';
      const title = `🔔 Novo Chamado${city}!`;
      const message = `${serviceLabel} — ${serviceData?.address || 'Endereço não informado'}. Aceite agora!`;

      const pushPromises = onlineProviders
        .filter(p => p.push_subscription)
        .map(provider =>
          base44.asServiceRole.functions.invoke('sendPushNotification', {
            providerId: provider.id,
            title,
            message,
            data: { requestId },
          }).catch(err => console.error(`[Push] Erro para ${provider.name}:`, err.message))
        );

      if (pushPromises.length > 0) {
        await Promise.all(pushPromises);
        console.log(`[Push] Notificações enviadas para ${pushPromises.length} prestador(es)`);
      } else {
        console.log('[Push] Nenhum prestador com subscription ativa');
      }
    } catch (pushErr) {
      console.error('[Push] Erro ao enviar pushes:', pushErr.message);
      // Não falha o fluxo principal
    }

    return Response.json({ success: true, service_number: serviceNumber });
  } catch (error) {
    console.error('Erro onServiceCreated:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});