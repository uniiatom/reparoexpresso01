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
      return Response.json({ error: 'requestId required' }, { status: 400 });
    }

    const resultText = isFeasible
      ? `Viavel para instalacao. ${reason || 'Local adequado.'}`
      : `Nao viavel. ${reason || 'Motivo nao especificado.'}`;

    await base44.entities.ServiceRequest.update(requestId, {
      tech_visit_reason: resultText
    });

    return Response.json({
      success: true,
      isFeasible,
      resultText
    });
  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});