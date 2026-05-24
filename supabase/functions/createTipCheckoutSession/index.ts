import Stripe from 'https://esm.sh/stripe@17.0.0?target=deno';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { requireUser } from '../_shared/supabase.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-11-20.acacia',
});

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const { service_id, provider_id, amount, client_email, service_number } = await req.json();

    if (!service_id || !provider_id || !amount || amount < 500) {
      return jsonResponse({ error: 'Parâmetros inválidos' }, 400);
    }

    const appUrl = Deno.env.get('APP_BASE_URL') ?? 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `Gorjeta para o serviço ${service_number || service_id}`,
              description: 'Agradeça ao seu prestador pelo ótimo serviço',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/acompanhar/${service_id}?tip=success`,
      cancel_url: `${appUrl}/acompanhar/${service_id}?tip=cancelled`,
      customer_email: client_email || user.email,
      metadata: {
        type: 'tip',
        service_id,
        provider_id,
        tip_amount: String(amount),
        service_number: service_number || '',
      },
    });

    return jsonResponse({
      checkout_url: session.url,
      session_id: session.id,
      amount_brl: amount / 100,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
