import Stripe from 'https://esm.sh/stripe@17.0.0?target=deno';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-11-20.acacia',
});

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;

    const { service_id, new_total, extra_charges = [] } = await req.json();
    if (!service_id || !new_total) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }

    const supabase = getServiceClient();
    const { data: service, error } = await supabase
      .from('service_requests')
      .select('*')
      .eq('id', service_id)
      .maybeSingle();

    if (error) throw error;
    if (!service) return jsonResponse({ error: 'Service not found' }, 404);

    const appUrl = Deno.env.get('APP_BASE_URL') ?? 'http://localhost:3000';
    const description =
      extra_charges.length > 0
        ? `Serviço #${service.service_number} + ${extra_charges.map((c: { description: string }) => c.description).join(', ')}`
        : `Serviço #${service.service_number}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: description,
              description: `Cliente: ${service.client_name} | Prestador: ${service.provider_name}`,
            },
            unit_amount: Math.round(new_total * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/acompanhar/${service_id}?payment=success`,
      cancel_url: `${appUrl}/acompanhar/${service_id}?payment=cancelled`,
      customer_email: service.created_by,
      metadata: {
        service_id,
        serviceRequestId: service_id,
        has_extra_charges: 'true',
      },
    });

    // Não existe coluna checkout_url em service_requests (ver MIGRATION.md
    // seção 0.1) — o link é devolvido direto pro caller abaixo, ninguém lê
    // de volta do banco hoje.

    return jsonResponse({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno' }, 500);
  }
});
