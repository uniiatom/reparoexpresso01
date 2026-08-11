import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { serviceRequestId, clientEmail, clientName } = await req.json();

    if (!serviceRequestId || !clientEmail || !clientName) {
      return Response.json(
        { error: 'Parâmetros obrigatórios: serviceRequestId, clientEmail, clientName' },
        { status: 400 }
      );
    }

    // Busca o serviço
    const service = await base44.entities.ServiceRequest.get(serviceRequestId);
    if (!service) {
      return Response.json({ error: 'Serviço não encontrado' }, { status: 404 });
    }

    // Calcula data de término
    const warrantyEndDate = new Date();
    warrantyEndDate.setDate(warrantyEndDate.getDate() + 90);

    // Envia email de ativação da garantia
    const emailContent = `
Olá ${clientName},

🛡️ Garantia Ativada com Sucesso!

Seu serviço foi concluído com sucesso e sua garantia de 90 dias foi ativada automaticamente!

📋 Detalhes do Serviço:
• Número: ${service.service_number || 'N/A'}
• Tipo: ${service.service_type}
• Data de Conclusão: ${new Date(service.updated_date).toLocaleDateString('pt-BR')}
• Data de Término: ${warrantyEndDate.toLocaleDateString('pt-BR')}

🛡️ O que a Garantia Cobre:
✓ Problemas no local exato onde o serviço foi realizado
✓ Até 90 dias após a conclusão
✓ Sem custo adicional

⚠️ O que a Garantia NÃO Cobre:
✗ Problemas em outros locais
✗ Danos causados por terceiros
✗ Desgaste natural ou uso inadequado

📍 Próximas Etapas:
Se o problema persistir ou surgir dentro do prazo de garantia, você pode solicitar um retorno através da plataforma:
1. Acesse sua área de garantia
2. Clique em "Solicitar Retorno"
3. Selecione o tipo de retorno (Retorno em Garantia)
4. Descreva o problema
5. Escolha uma data e horário

Acesse sua página de garantia: https://app.exemplo.com/garantia

Obrigado por confiar em nossos serviços!

Atenciosamente,
Equipe de Suporte
    `.trim();

    await base44.integrations.Core.SendEmail({
      to: clientEmail,
      subject: `🛡️ Sua Garantia de 90 Dias foi Ativada - ${service.service_number || 'Serviço Concluído'}`,
      body: emailContent,
    });

    return Response.json({
      success: true,
      message: 'Email de ativação de garantia enviado com sucesso',
      warranty_end_date: warrantyEndDate.toISOString(),
    });
  } catch (error) {
    console.error('Erro ao notificar ativação de garantia:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});