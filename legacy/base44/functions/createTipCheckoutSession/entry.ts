import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { service_id, provider_id, amount, client_email, service_number } = await req.json();

    if (!service_id || !provider_id || !amount || amount < 500) { // 500 = R$ 5,00
      return Response.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    // Cria sessão Stripe para gorjeta
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `Gorjeta para o serviço ${service_number || service_id}`,
              description: `Agradeça ao seu prestador pelo ótimo serviço`,
              images: [],
            },
            unit_amount: amount, // em centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${Deno.env.get('APP_URL') || 'https://app.example.com'}/acompanhar/${service_id}?tip=success`,
      cancel_url: `${Deno.env.get('APP_URL') || 'https://app.example.com'}/acompanhar/${service_id}?tip=cancelled`,
      customer_email: client_email || user.email,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        service_id,
        provider_id,
        tip_amount: amount,
        service_number,
      },
    });

    console.log(`[createTipCheckoutSession] Sessão criada:`, session.id, `| Provider: ${provider_id} | Valor: R$ ${(amount / 100).toFixed(2)}`);

    return Response.json({
      checkout_url: session.url,
      session_id: session.id,
      amount_brl: amount / 100,
    });
  } catch (error) {
    console.error('[createTipCheckoutSession] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});