import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cnpj } = await req.json();

    if (!cnpj || cnpj.replace(/\D/g, '').length !== 14) {
      return Response.json({ error: 'CNPJ inválido' }, { status: 400 });
    }

    const cleanCNPJ = cnpj.replace(/\D/g, '');

    // Validar CNPJ via API (usando mbrapi.com.br como exemplo)
    try {
      const response = await fetch(`https://mbrapi.com.br/api/cnpj/${cleanCNPJ}/`, {
        method: 'GET',
      });

      if (!response.ok) {
        console.error('CNPJ não encontrado na API');
        return Response.json({ valid: false, error: 'CNPJ não encontrado' }, { status: 200 });
      }

      const data = await response.json();

      // Validar se o CNPJ está ativo
      if (data.status === 'Ativa' || data.status === 'ATIVA') {
        const companyData = {
          cnpj: `${cleanCNPJ.slice(0, 2)}.${cleanCNPJ.slice(2, 5)}.${cleanCNPJ.slice(5, 8)}/${cleanCNPJ.slice(8, 12)}-${cleanCNPJ.slice(12)}`,
          razao_social: data.nome,
          nome_fantasia: data.fantasia || data.nome,
          situacao: 'Ativa',
          endereco: data.logradouro || '',
          numero: data.numero || '',
          bairro: data.bairro || '',
          cidade: data.municipio || '',
          uf: data.uf || '',
          cep: data.cep || '',
          telefone: data.telefone || '',
          email: data.email || '',
          natureza_juridica: data.natureza_juridica || '',
          data_abertura: data.data_abertura || '',
        };

        return Response.json({
          valid: true,
          company_data: companyData,
        });
      } else {
        return Response.json({
          valid: false,
          error: 'CNPJ inativo ou inacessível',
        });
      }
    } catch (apiError) {
      console.error('Erro ao consultar API de CNPJ:', apiError);
      // Se a API falhar, retornar erro
      return Response.json({
        valid: false,
        error: 'Erro ao validar CNPJ. Tente novamente em alguns momentos.',
      });
    }
  } catch (error) {
    console.error('Erro na função validateCNPJ:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});