import Stripe from 'https://esm.sh/stripe@17.0.0?target=deno';
import { getServiceClient } from '../_shared/supabase.ts';
import { invokeInternalFunction } from '../_shared/internalInvoke.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-11-20.acacia',
});

async function creditTipToProvider(
  supabase: ReturnType<typeof getServiceClient>,
  providerId: string,
  serviceId: string,
  tipAmountCents: number,
) {
  const tipAmount = tipAmountCents / 100;
  const { data: wallets } = await supabase
    .from('wallets')
    .select('*')
    .eq('owner_id', providerId)
    .eq('owner_type', 'prestador')
    .limit(1);

  let wallet = wallets?.[0];
  if (!wallet) {
    const { data: provider } = await supabase
      .from('providers')
      .select('name, email')
      .eq('id', providerId)
      .maybeSingle();

    const { data: created, error } = await supabase
      .from('wallets')
      .insert({
        owner_id: providerId,
        owner_type: 'prestador',
        owner_name: provider?.name || '',
        owner_email: provider?.email || '',
        balance: tipAmount,
        pending_balance: 0,
        total_earned: tipAmount,
        total_withdrawn: 0,
      })
      .select()
      .single();
    if (error) throw error;
    wallet = created;
  } else {
    const newBalance = Number(wallet.balance) + tipAmount;
    await supabase.from('wallets').update({
      balance: newBalance,
      total_earned: Number(wallet.total_earned || 0) + tipAmount,
    }).eq('id', wallet.id);
    wallet = { ...wallet, balance: newBalance };
  }

  await supabase.from('wallet_transactions').insert({
    wallet_id: wallet.id,
    owner_id: providerId,
    owner_type: 'prestador',
    type: 'tip',
    amount: tipAmount,
    balance_after: wallet.balance,
    description: `Gorjeta do serviço ${serviceId}`,
    reference_id: serviceId,
    reference_type: 'tip_payment',
    status: 'completed',
  });

  await supabase.from('provider_notifications').insert({
    provider_id: providerId,
    type: 'tip_received',
    title: 'Gorjeta recebida!',
    message: `Você recebeu R$ ${tipAmount.toFixed(2)} de gorjeta.`,
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const body = await req.text();

    if (!webhookSecret || !signature) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
    }

    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    const supabase = getServiceClient();

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata ?? {};

      if (metadata.type === 'tip' && metadata.provider_id && metadata.service_id) {
        const tipCents = Number(metadata.tip_amount || session.amount_total || 0);
        await creditTipToProvider(
          supabase,
          metadata.provider_id,
          metadata.service_id,
          tipCents,
        );
      } else {
        const serviceRequestId = metadata.serviceRequestId ?? metadata.service_id;
        if (serviceRequestId) {
          const amount = (session.amount_total ?? 0) / 100;
          await supabase
            .from('service_requests')
            .update({
              payment_status: 'paid',
              payment_session_id: session.id,
              final_price: amount,
              payment_completed_at: new Date().toISOString(),
            })
            .eq('id', serviceRequestId);

          await invokeInternalFunction('processProviderRepayment', { serviceRequestId });
        }
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      const serviceRequestId = session.metadata?.serviceRequestId ?? session.metadata?.service_id;
      if (serviceRequestId) {
        await supabase
          .from('service_requests')
          .update({ payment_status: 'expired' })
          .eq('id', serviceRequestId);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Webhook error' }),
      { status: 400 },
    );
  }
});