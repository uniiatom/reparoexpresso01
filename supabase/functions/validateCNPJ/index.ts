import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;

    const { cnpj } = await req.json();
    if (!cnpj || cnpj.replace(/\D/g, '').length !== 14) {
      return jsonResponse({ error: 'CNPJ inválido' }, 400);
    }

    const cleanCNPJ = cnpj.replace(/\D/g, '');

    try {
      const response = await fetch(`https://mbrapi.com.br/api/cnpj/${cleanCNPJ}/`);
      if (!response.ok) {
        return jsonResponse({ valid: false, error: 'CNPJ não encontrado' });
      }

      const data = await response.json();
      const status = String(data.status ?? '').toUpperCase();

      if (status === 'ATIVA') {
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

        return jsonResponse({ valid: true, company_data: companyData });
      }

      return jsonResponse({ valid: false, error: 'CNPJ inativo ou inacessível' });
    } catch {
      return jsonResponse({
        valid: false,
        error: 'Erro ao validar CNPJ. Tente novamente em alguns momentos.',
      });
    }
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
