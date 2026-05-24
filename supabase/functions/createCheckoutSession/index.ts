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
    const { user } = auth;

    const { serviceRequestId, amount, serviceName, couponId, couponCode, discountAmount, originalPrice } =
      await req.json();

    if (!serviceRequestId || !amount || amount <= 0) {
      return jsonResponse({ error: 'Invalid amount or request ID' }, 400);
    }

    const supabase = getServiceClient();
    const appUrl = Deno.env.get('APP_BASE_URL') ?? 'http://localhost:3000';

    await supabase
      .from('service_requests')
      .update({
        coupon_id: couponId || null,
        coupon_code: couponCode || null,
        discount_amount: discountAmount || 0,
        original_price: originalPrice || amount,
      })
      .eq('id', serviceRequestId);

    if (couponCode) {
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/incrementCouponUsage`, {
          method: 'POST',
          headers: {
            Authorization: req.headers.get('Authorization') ?? '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ couponCode }),
        });
      } catch {
        /* não bloqueia checkout */
      }
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
      success_url: `${appUrl}/acompanhar/${serviceRequestId}?payment=success`,
      cancel_url: `${appUrl}/acompanhar/${serviceRequestId}`,
      customer_email: user.email,
      metadata: {
        serviceRequestId,
        userId: user.id,
        userEmail: user.email ?? '',
        couponId: couponId || '',
        couponCode: couponCode || '',
      },
    });

    return jsonResponse({ sessionUrl: session.url, sessionId: session.id });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno' }, 500);
  }
});
