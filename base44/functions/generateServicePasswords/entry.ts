import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Gera uma senha aleatória de 6 dígitos
function generatePassword() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { request_id } = body;

    if (!request_id) {
      return Response.json({ error: 'request_id é obrigatório' }, { status: 400 });
    }

    // Busca a solicitação de serviço
    const serviceRequest = await base44.entities.ServiceRequest.get(request_id);
    if (!serviceRequest) {
      return Response.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }

    // Gera as duas senhas
    const securityPassword = generatePassword();
    const validationPassword = generatePassword();

    // Atualiza a solicitação com as senhas
    await base44.entities.ServiceRequest.update(request_id, {
      security_password: securityPassword,
      validation_password: validationPassword,
      passwords_generated_at: new Date().toISOString()
    });

    // Envia SMS/WhatsApp para o prestador com a senha de segurança
    if (serviceRequest.provider_phone) {
      const providerMessage = `Me Socorro: Senha de segurança: ${securityPassword}\n\nO cliente solicitará esta senha antes de autorizar sua entrada.`;
      
      await base44.integrations.Core.SendEmail({
        to: serviceRequest.provider_phone,
        subject: 'Senha de Segurança - Me Socorro',
        body: providerMessage
      });
    }

    // Envia SMS/WhatsApp para o cliente com ambas as informações
    if (serviceRequest.client_phone) {
      const clientMessage = `Me Socorro: Prestador chegando!\n\nSenha de segurança para o prestador: ${securityPassword}\nSenha de validação do prestador: ${validationPassword}\n\nInforme a senha de validação ao prestador para que ele valide sua chegada no sistema.`;
      
      await base44.integrations.Core.SendEmail({
        to: serviceRequest.client_phone,
        subject: 'Senhas de Acesso - Me Socorro',
        body: clientMessage
      });
    }

    return Response.json({
      success: true,
      request_id,
      security_password: securityPassword,
      validation_password: validationPassword,
      sent_to_provider: !!serviceRequest.provider_phone,
      sent_to_client: !!serviceRequest.client_phone
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});