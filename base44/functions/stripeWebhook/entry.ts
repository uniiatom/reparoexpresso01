import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const stripe = await import('npm:stripe@17.0.0').then(m => new m.default(Deno.env.get('STRIPE_SECRET_KEY')));

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const body = await req.text();

    if (!webhookSecret || !signature) {
      console.error('Missing webhook secret or signature');
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
    }

    // Construct event using async method for Deno's async crypto
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    console.log(`Received webhook event: ${event.type}`);

    // Handle different event types
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log(`Payment completed for session: ${session.id}`);
      console.log(`Metadata:`, session.metadata);

      // Initialize base44 for service role operations
      const base44 = createClientFromRequest(req);

      // Update service request with payment info
      if (session.metadata?.serviceRequestId) {
        try {
          await base44.asServiceRole.entities.ServiceRequest.update(
            session.metadata.serviceRequestId,
            {
              payment_status: 'paid',
              payment_session_id: session.id,
              payment_completed_at: new Date().toISOString(),
            }
          );
          console.log(`Updated ServiceRequest ${session.metadata.serviceRequestId} with payment info`);
        } catch (error) {
          console.error(`Error updating service request:`, error.message);
        }
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object;
      console.log(`Payment session expired: ${session.id}`);

      if (session.metadata?.serviceRequestId) {
        try {
          const base44 = createClientFromRequest(req);
          await base44.asServiceRole.entities.ServiceRequest.update(
            session.metadata.serviceRequestId,
            {
              payment_status: 'expired',
            }
          );
        } catch (error) {
          console.error(`Error updating service request:`, error.message);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
});