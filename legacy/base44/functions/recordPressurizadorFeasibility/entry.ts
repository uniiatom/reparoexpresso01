import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requestId, isFeasible, reason } = await req.json();

    if (!requestId) {
      return Response.json({ error: 'requestId é obrigatório' }, { status: 400 });
    }

    // Atualiza a OS com o resultado da viabilidade
    const feasibilityText = isFeasible
      ? `✓ Viável para instalação. ${reason || 'Local adequado para instalação.'}`
      : `✗ Não viável. ${reason || 'Motivo não especificado.'}`;

    await base44.entities.ServiceRequest.update(requestId, {
      tech_visit_reason: feasibilityText
    });

    return Response.json({
      success: true,
      message: 'Viabilidade registrada com sucesso',
      isFeasible,
      reason: feasibilityText
    });
  } catch (error) {
    console.error('[recordPressurizadorFeasibility]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});