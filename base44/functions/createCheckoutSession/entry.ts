import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const stripe = await import('npm:stripe@17.0.0').then(m => new m.default(Deno.env.get('STRIPE_SECRET_KEY')));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { serviceRequestId, amount, serviceName } = await req.json();

    if (!serviceRequestId || !amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount or request ID' }), { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `Pagamento - ${serviceName || 'Serviço'}`,
              description: `Serviço ID: ${serviceRequestId}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${Deno.env.get('BASE44_APP_URL') || 'http://localhost:5173'}/acompanhar/${serviceRequestId}?payment=success`,
      cancel_url: `${Deno.env.get('BASE44_APP_URL') || 'http://localhost:5173'}/acompanhar/${serviceRequestId}`,
      customer_email: user.email,
      metadata: {
        serviceRequestId,
        userId: user.id,
        userEmail: user.email,
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
      },
    });

    console.log(`Created checkout session ${session.id} for amount ${amount} BRL`);

    return new Response(JSON.stringify({ sessionUrl: session.url, sessionId: session.id }), { status: 200 });
  } catch (error) {
    console.error('Checkout session creation error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});