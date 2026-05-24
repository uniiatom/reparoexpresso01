import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const { descricao, fotos = [], usuario_email, usuario_nome } = await req.json();
    if (!descricao?.trim()) {
      return jsonResponse({ error: 'Descrição obrigatória' }, 400);
    }

    const supabase = getServiceClient();
    const fotosList = Array.isArray(fotos) ? fotos : [];
    const messageBody = [
      descricao,
      fotosList.length ? `\n\nFotos (${fotosList.length}):\n${fotosList.join('\n')}` : '',
    ].join('');

    const { data: ticket, error: tErr } = await supabase
      .from('tickets')
      .insert({
        client_name: usuario_nome || user.full_name,
        client_email: usuario_email || user.email,
        type: 'outros_servicos',
        subject: `Solicitação "Outros Serviços" — ${usuario_nome || user.full_name}`,
        message: messageBody,
        status: 'aberto',
        priority: 'alta',
      })
      .select('id')
      .single();

    if (tErr) throw tErr;

    const { data: admins } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('role', ['admin', 'atendente']);

    const notified = admins?.length ?? 0;

    await supabase.from('admin_activity_logs').insert({
      action: 'outros_servicos_solicitacao',
      actor_name: usuario_nome || user.full_name,
      actor_email: usuario_email || user.email,
      entity_type: 'Ticket',
      entity_id: ticket.id,
      entity_label: 'Outros Serviços',
      details: `Nova solicitação. ${fotosList.length} foto(s) anexada(s). ${notified} admin(s) no sistema.`,
    });

    return jsonResponse({ success: true, notificados: notified, ticket_id: ticket.id });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
