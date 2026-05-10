import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event;
  try {
    // IMPORTANTE: Deno usa async crypto, use constructEventAsync
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('[processTipPayment] Erro ao validar assinatura Stripe:', err.message);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const base44 = createClientFromRequest(req);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { service_id, provider_id, tip_amount } = session.metadata || {};

      if (!service_id || !provider_id || !tip_amount) {
        console.log('[processTipPayment] Metadata incompleta:', session.metadata);
        return Response.json({ success: true }); // Ignora silenciosamente
      }

      console.log(`[processTipPayment] Pagamento de gorjeta confirmado: Serviço ${service_id} | Provider ${provider_id} | R$ ${(tip_amount / 100).toFixed(2)}`);

      // Creditou gorjeta na carteira do prestador
      const tipAmountReal = Math.round(tip_amount);
      
      try {
        // Busca ou cria wallet do prestador
        const wallets = await base44.asServiceRole.entities.Wallet.filter({ owner_id: provider_id });
        let wallet = wallets[0];

        if (!wallet) {
          // Cria wallet se não existir
          wallet = await base44.asServiceRole.entities.Wallet.create({
            owner_id: provider_id,
            balance: tipAmountReal,
          });
          console.log('[processTipPayment] Nova wallet criada:', wallet.id);
        } else {
          // Atualiza saldo
          const newBalance = (wallet.balance || 0) + tipAmountReal;
          await base44.asServiceRole.entities.Wallet.update(wallet.id, {
            balance: newBalance,
          });
          console.log('[processTipPayment] Wallet atualizada:', wallet.id, `| Novo saldo: R$ ${(newBalance / 100).toFixed(2)}`);
        }

        // Registra transação na carteira
        await base44.asServiceRole.entities.WalletTransaction.create({
          wallet_id: wallet.id || wallet,
          owner_id: provider_id,
          type: 'credit',
          amount: tipAmountReal,
          description: `Gorjeta recebida do serviço ${service_id}`,
          reference_id: session.payment_intent,
          reference_type: 'tip_payment',
        });

        console.log('[processTipPayment] Transação registrada com sucesso');

        // Notifica o prestador sobre a gorjeta
        try {
          await base44.functions.invoke('sendPushNotification', {
            user_id: provider_id,
            title: '🎉 Gorjeta recebida!',
            message: `Você recebeu R$ ${(tipAmountReal / 100).toFixed(2)} de gorjeta. Já creditado na sua carteira!`,
            action_url: '/carteira',
          });
        } catch (e) {
          console.log('[processTipPayment] Erro ao enviar notificação:', e.message);
        }
      } catch (err) {
        console.error('[processTipPayment] Erro ao creditar gorjeta:', err.message);
        return Response.json({ error: 'Failed to credit tip' }, { status: 500 });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[processTipPayment] Erro geral:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});