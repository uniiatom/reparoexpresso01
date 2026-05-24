import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;
    const { user, supabase } = auth;

    const { cnpj, company_data, documents } = await req.json();
    if (!cnpj || !company_data || !documents) {
      return jsonResponse({ error: 'Dados incompletos' }, 400);
    }

    const { data: providers, error: pErr } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (pErr) throw pErr;
    if (!providers?.length) {
      return jsonResponse({ error: 'Prestador não encontrado' }, 404);
    }

    const provider = providers[0];
    const addressLine = [company_data.endereco, company_data.numero].filter(Boolean).join(', ');

    const { error: uErr } = await supabase.from('providers').update({
      cnpj,
      company_name: company_data.razao_social,
      company_fantasy_name: company_data.nome_fantasia,
      address: addressLine || null,
      neighborhood: company_data.bairro || null,
      city: company_data.cidade || null,
      state: company_data.uf || null,
      zip_code: company_data.cep || null,
      cnpj_url: documents.cnpj_file || null,
      address_proof_url: documents.address_proof || null,
      legal_rep_id_url: documents.legal_rep_id || null,
      cnpj_status: 'enviado',
      fiscal_data_verified: true,
      fiscal_data_verified_at: new Date().toISOString(),
    }).eq('id', provider.id);

    if (uErr) throw uErr;

    return jsonResponse({
      success: true,
      message: 'Dados fiscais salvos com sucesso',
      provider_id: provider.id,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
