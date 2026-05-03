import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { provider_id } = body;

    if (!provider_id) {
      return Response.json({ error: 'provider_id is required' }, { status: 400 });
    }

    // Verifica se o prestador logado é o mesmo que está aceitando
    const provider = await base44.entities.Provider.get(provider_id);
    if (!provider || provider.user_id !== user.id) {
      return Response.json({ error: 'Forbidden: Cannot accept terms for another provider' }, { status: 403 });
    }

    // Atualiza a aceitação dos termos
    const now = new Date().toISOString();
    await base44.entities.Provider.update(provider_id, {
      terms_accepted_at: now
    });

    return Response.json({
      success: true,
      accepted_at: now
    });
  } catch (error) {
    console.error('Error in acceptProviderTerms:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});