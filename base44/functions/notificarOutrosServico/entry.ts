import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { descricao, fotos = [], usuario_email, usuario_nome } = await req.json();

    if (!descricao) {
      return Response.json({ error: 'Descrição obrigatória' }, { status: 400 });
    }

    // Busca todos os atendentes (role = admin ou atendente)
    const admins = await base44.asServiceRole.entities.User.list();
    const atendentes = admins.filter(u =>
      u.role === 'admin' || u.role === 'atendente'
    );

    const fotosHtml = fotos.length > 0
      ? `<p><strong>Fotos anexadas:</strong> ${fotos.length} foto(s)</p>` +
        fotos.map((url, i) => `<p><a href="${url}" target="_blank">📷 Ver foto ${i + 1}</a></p>`).join('')
      : '<p><em>Nenhuma foto enviada.</em></p>';

    const corpoEmail = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 12px;">
        <div style="background: #f59e0b; padding: 16px 24px; border-radius: 8px 8px 0 0;">
          <h2 style="color: #1c1917; margin: 0; font-size: 20px;">🔔 Nova solicitação — Outros Serviços</h2>
        </div>
        <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          <p><strong>Cliente:</strong> ${usuario_nome}</p>
          <p><strong>Email:</strong> ${usuario_email}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <p><strong>O que o cliente precisa:</strong></p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 8px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${descricao}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          ${fotosHtml}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <p style="color: #6b7280; font-size: 13px;">Entre em contato com o cliente o mais breve possível para dar continuidade ao atendimento.</p>
        </div>
      </div>
    `;

    // Envia e-mail para cada atendente
    const envios = atendentes.map(atendente =>
      base44.asServiceRole.integrations.Core.SendEmail({
        to: atendente.email,
        subject: `🔔 Nova solicitação "Outros Serviços" — ${usuario_nome}`,
        body: corpoEmail,
        from_name: 'Sistema de Atendimento',
      }).catch(e => console.error(`Erro ao enviar para ${atendente.email}:`, e))
    );

    if (envios.length > 0) {
      await Promise.all(envios);
    } else {
      console.warn('Nenhum atendente/admin encontrado para notificar.');
    }

    console.log(`Notificação "Outros Serviços" enviada para ${envios.length} atendente(s). Cliente: ${usuario_email}`);

    return Response.json({ success: true, notificados: envios.length });
  } catch (error) {
    console.error('Erro em notificarOutrosServico:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});