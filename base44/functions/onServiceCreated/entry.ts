import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function generatePassword() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function generateServiceNumber(base44) {
  // Conta quantos serviços existem para gerar número sequencial
  const all = await base44.asServiceRole.entities.ServiceRequest.list('-created_date', 1000);
  const count = all.length;
  const padded = String(count).padStart(6, '0');
  return `ATD-${padded}`;
}

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

    return Response.json({ success: true, service_number: serviceNumber });
  } catch (error) {
    console.error('Erro onServiceCreated:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});