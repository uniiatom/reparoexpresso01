import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;

    const { requestId, amount } = await req.json();
    if (!requestId || !amount) {
      return jsonResponse({ error: 'Missing requestId or amount' }, 400);
    }

    const supabase = getServiceClient();
    const { data: serviceRequest, error } = await supabase
      .from('service_requests')
      .select('id')
      .eq('id', requestId)
      .maybeSingle();

    if (error) throw error;
    if (!serviceRequest) return jsonResponse({ error: 'Service request not found' }, 404);

    const pixId = `${requestId}-${Date.now()}`;
    const pixKey = `00020126360014br.gov.bcb.pix0136${pixId}`;
    const qrCodeData = `00020126360014br.gov.bcb.pix0136${pixId}5204000053039865802BR5913ME SOCORRO6009SAO PAULO62410503***63043D91`;

    // Não existe coluna pra pix_key/pix_id/pix_amount/pix_created_at/
    // pix_status em service_requests (ver MIGRATION.md seção 0.1) — nada lê
    // esse estado hoje, o QR/copia-e-cola é gerado e devolvido direto pro
    // caller. "Sem detecção automática de pagamento confirmado" já é
    // limitação conhecida (ver seção 3).

    return jsonResponse({
      success: true,
      pixId,
      pixKey,
      amount,
      qrCodeData,
      expiresIn: 900,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno' }, 500);
  }
});
