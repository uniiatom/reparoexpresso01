import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { client_id } = body;

    if (!client_id) {
      return Response.json({ error: 'client_id is required' }, { status: 400 });
    }

    // Verifica se o cliente logado é o mesmo que está aceitando
    const client = await base44.entities.Client.get(client_id);
    if (!client || client.user_id !== user.id) {
      return Response.json({ error: 'Forbidden: Cannot accept terms for another client' }, { status: 403 });
    }

    // Atualiza a aceitação dos termos
    const now = new Date().toISOString();
    await base44.entities.Client.update(client_id, {
      terms_accepted_at: now
    });

    return Response.json({
      success: true,
      accepted_at: now
    });
  } catch (error) {
    console.error('Error in acceptClientTerms:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});