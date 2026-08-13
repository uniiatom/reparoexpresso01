import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { requireUser } from '../_shared/supabase.ts';

interface PartItem {
  name: string;
  category?: string;
  quantity: number;
  unit_price: number;
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;
    const { supabase } = auth;

    const {
      request_id,
      selectedParts = [],
      laborCost = 0,
      observations = '',
      additionalNotes = '',
    } = await req.json();

    if (!request_id) return jsonResponse({ error: 'request_id é obrigatório' }, 400);

    const { data: service, error } = await supabase
      .from('service_requests')
      .select('*, professions(name), sub_services(name)')
      .eq('id', request_id)
      .maybeSingle();

    if (error) throw error;
    if (!service) return jsonResponse({ error: 'Serviço não encontrado' }, 404);

    const parts = selectedParts as PartItem[];
    const partsTotal = parts.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const total = partsTotal + Number(laborCost);
    const dateStr = new Date().toLocaleDateString('pt-BR');

    const htmlContent = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório ${service.service_number}</title></head><body style="font-family:Arial,sans-serif;padding:40px"><h1>Relatório de Serviço</h1><p>Solicitação #${service.service_number} • ${dateStr}</p><h2>Informações</h2><p><strong>Tipo:</strong> ${service.sub_services?.name ?? service.professions?.name ?? '—'}</p><p><strong>Cliente:</strong> ${service.client_name}</p><p><strong>Endereço:</strong> ${service.address || ''}, ${service.city || ''}</p><h2>Peças/Materiais</h2>${parts.map((p) => `<p>${p.name} x${p.quantity} — R$ ${(p.unit_price * p.quantity).toFixed(2)}</p>`).join('') || '<p>Nenhuma peça registrada.</p>'}<h2>Mão de obra</h2><p>R$ ${Number(laborCost).toFixed(2)}</p>${observations ? `<h2>Observações</h2><p>${observations}</p>` : ''}${additionalNotes ? `<h2>Notas adicionais</h2><p>${additionalNotes}</p>` : ''}<h2>Total: R$ ${total.toFixed(2)}</h2></body></html>`;

    const htmlBase64 = btoa(unescape(encodeURIComponent(htmlContent)));

    return jsonResponse({
      success: true,
      html: htmlContent,
      htmlBase64,
      totalAmount: total,
      partsTotal,
      laborCost: Number(laborCost),
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
