import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@18.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { service_id, new_total, extra_charges } = await req.json();

    if (!service_id || !new_total) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Busca o serviço
    const service = await base44.entities.ServiceRequest.get(service_id);
    if (!service) {
      return Response.json({ error: 'Service not found' }, { status: 404 });
    }

    // Cria nova sessão de checkout com o novo valor
    const description = extra_charges.length > 0
      ? `Serviço #${service.service_number} + ${extra_charges.map(c => c.description).join(', ')}`
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
            unit_amount: Math.round(new_total * 100), // em centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${Deno.env.get('APP_BASE_URL') || 'https://seu-app.com'}/acompanhar/${service_id}?payment=success`,
      cancel_url: `${Deno.env.get('APP_BASE_URL') || 'https://seu-app.com'}/acompanhar/${service_id}?payment=cancelled`,
      customer_email: service.created_by,
      metadata: {
        service_id,
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        has_extra_charges: 'true',
        extra_charges_count: extra_charges.length.toString(),
      },
    });

    // Atualiza o serviço com o novo checkout URL
    await base44.entities.ServiceRequest.update(service_id, {
      checkout_url: session.url,
    });

    return Response.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    console.error('[updateCheckoutWithExtraCharges]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});