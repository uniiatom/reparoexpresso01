import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cnpj, company_data, documents } = await req.json();

    if (!cnpj || !company_data || !documents) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Buscar o prestador pelo email do usuário
    const providers = await base44.entities.Provider.filter({ email: user.email });
    
    if (!providers || providers.length === 0) {
      return Response.json({ error: 'Prestador não encontrado' }, { status: 404 });
    }

    const provider = providers[0];

    // Atualizar dados do prestador com informações fiscais
    await base44.entities.Provider.update(provider.id, {
      // Dados do CNPJ
      cnpj: cnpj,
      
      // Dados da empresa
      company_name: company_data.razao_social,
      company_fantasy_name: company_data.nome_fantasia,
      company_address: company_data.endereco,
      company_number: company_data.numero,
      company_neighborhood: company_data.bairro,
      company_city: company_data.cidade,
      company_state: company_data.uf,
      company_zip_code: company_data.cep,
      
      // URLs dos documentos
      cnpj_document_url: documents.cnpj_file,
      address_proof_url: documents.address_proof,
      legal_rep_id_url: documents.legal_rep_id,
      
      // Status de verificação
      fiscal_data_verified: true,
      fiscal_data_verified_at: new Date().toISOString(),
    });

    // Enviar email de confirmação
    try {
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: '✅ Dados Fiscais Registrados com Sucesso',
        body: `Olá ${user.full_name},\n\nSeus dados fiscais foram registrados com sucesso na plataforma Reparo Expresso.\n\nCNPJ: ${cnpj}\nRazão Social: ${company_data.razao_social}\n\nA partir de agora você poderá emitir Notas Fiscais e receber pelos serviços prestados.\n\nEm caso de dúvidas, entre em contato conosco.\n\nAtenciosamente,\nReparo Expresso`,
      });
    } catch (emailError) {
      console.error('Erro ao enviar email:', emailError);
      // Não retornar erro se o email falhar
    }

    return Response.json({
      success: true,
      message: 'Dados fiscais salvos com sucesso',
      provider_id: provider.id,
    });
  } catch (error) {
    console.error('Erro na função saveProviderCNPJData:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});