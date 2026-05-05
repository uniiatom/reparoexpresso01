import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serviceRequestId } = await req.json();

    if (!serviceRequestId) {
      return Response.json({ error: 'Service request ID é obrigatório' }, { status: 400 });
    }

    // Busca a solicitação de serviço
    const serviceRequest = await base44.asServiceRole.entities.ServiceRequest.filter({
      id: serviceRequestId
    });

    if (serviceRequest.length === 0) {
      return Response.json({ error: 'Serviço não encontrado' }, { status: 404 });
    }

    const service = serviceRequest[0];

    // Valida se o prestador é o responsável
    if (service.provider_id !== user.id) {
      return Response.json({ error: 'Apenas o prestador responsável pode confirmar' }, { status: 403 });
    }

    // Valida se o serviço está concluído
    if (service.status !== 'concluido') {
      return Response.json({ error: 'Serviço precisa estar concluído primeiro' }, { status: 400 });
    }

    // Busca os bônus pendentes de validação relacionados a este serviço
    const bonuses = await base44.asServiceRole.entities.WalletBonus.filter({
      related_service_request_id: serviceRequestId,
      validation_status: 'pending_provider_confirmation'
    });

    if (bonuses.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'Nenhum bônus pendente de validação para este serviço' 
      });
    }

    // Valida e ativa todos os bônus pendentes
    const now = new Date().toISOString();
    const validatedBonuses = [];

    for (const bonus of bonuses) {
      await base44.asServiceRole.entities.WalletBonus.update(bonus.id, {
        validation_status: 'validated',
        validated_by: user.email,
        validated_at: now
      });
      validatedBonuses.push(bonus);

      // Credita o bônus na carteira do cliente
      try {
        await base44.asServiceRole.functions.invoke('creditBonusToWallet', { 
          bonusId: bonus.id 
        });
      } catch (err) {
        console.error(`Falha ao creditar bônus ${bonus.id}:`, err.message);
      }
    }

    console.log(`✓ ${validatedBonuses.length} bônus(s) validado(s) e creditado(s) para o cliente`);

    return Response.json({
      success: true,
      bonusesValidated: validatedBonuses.length,
      totalAmount: validatedBonuses.reduce((sum, b) => sum + b.amount, 0),
      message: `${validatedBonuses.length} bônus creditado(s) com sucesso!`
    });

  } catch (error) {
    console.error('Service completion validation error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});