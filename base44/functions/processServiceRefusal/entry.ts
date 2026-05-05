import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { service_request_id, provider_id, reasons, description, photos } = await req.json();

    // Validação
    if (!service_request_id || !provider_id || !reasons?.length || !description?.trim() || !photos?.length) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Buscar a solicitação de serviço
    const serviceRequest = await base44.asServiceRole.entities.ServiceRequest.get(service_request_id);
    if (!serviceRequest) {
      return Response.json({ error: 'Serviço não encontrado' }, { status: 404 });
    }

    if (serviceRequest.provider_id !== provider_id || serviceRequest.provider_id !== user.id) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar o cliente
    const clientId = serviceRequest.client_id;
    const client = await base44.asServiceRole.entities.Client.get(clientId);

    // Buscar a wallet do cliente para estorno
    const clientWallets = await base44.asServiceRole.entities.Wallet.filter({
      owner_id: clientId,
      owner_type: 'cliente'
    });

    let clientWallet = clientWallets[0];
    if (!clientWallet) {
      // Criar wallet se não existir
      clientWallet = await base44.asServiceRole.entities.Wallet.create({
        owner_id: clientId,
        owner_type: 'cliente',
        owner_name: client?.name || 'Cliente',
        owner_email: serviceRequest.client_phone || '',
        balance: 0,
        pending_balance: 0,
      });
    }

    // Calcular estorno: preço original - taxa de deslocamento
    const originalPrice = serviceRequest.original_price || serviceRequest.final_price || serviceRequest.estimated_price || 0;
    const displacementFeePercent = 15; // 15% de taxa de deslocamento (ajustar conforme política)
    const displacementFee = (originalPrice * displacementFeePercent) / 100;
    const refundAmount = Math.max(0, originalPrice - displacementFee);

    // Registrar a recusa como entity
    const refusalRecord = await base44.asServiceRole.entities.ServiceRequest.update(service_request_id, {
      status: 'cancelado',
      decline_reason: JSON.stringify({
        type: 'technical_refusal',
        reasons,
        description,
        photos,
        timestamp: new Date().toISOString(),
      }),
    });

    // Processar estorno se houver valor
    if (refundAmount > 0) {
      // Adicionar ao saldo pendente da wallet
      const newPendingBalance = (clientWallet.pending_balance || 0) + refundAmount;
      
      await base44.asServiceRole.entities.Wallet.update(clientWallet.id, {
        pending_balance: newPendingBalance,
      });

      // Registrar transação de estorno
      await base44.asServiceRole.entities.WalletTransaction.create({
        wallet_id: clientWallet.id,
        owner_id: clientId,
        owner_type: 'cliente',
        type: 'refund',
        amount: refundAmount,
        balance_after: clientWallet.balance + newPendingBalance,
        description: `Estorno por recusa técnica do serviço ${serviceRequest.service_number}`,
        reference_id: service_request_id,
        reference_type: 'refund',
        status: 'pending',
      });
    }

    // Registrar no log de atividades
    await base44.asServiceRole.entities.AdminActivityLog.create({
      action: 'service_refused',
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      entity_type: 'ServiceRequest',
      entity_id: service_request_id,
      entity_label: `${serviceRequest.service_type} - ${serviceRequest.client_name}`,
      old_value: serviceRequest.status,
      new_value: 'cancelado',
      details: `Recusa técnica justificada. Motivos: ${reasons.join(', ')}. Descrição: ${description}. Estorno: R$ ${refundAmount.toFixed(2)} (taxa de deslocamento: R$ ${displacementFee.toFixed(2)})`,
    });

    // Notificar cliente sobre o estorno
    if (clientWallet) {
      await base44.asServiceRole.entities.ClientNotification.create({
        client_id: clientId,
        client_email: serviceRequest.client_phone || client?.name || 'cliente',
        type: 'warning',
        title: 'Serviço Cancelado - Recusa Técnica',
        message: `O prestador cancelou o serviço devido a condições operacionais do local. Um estorno de R$ ${refundAmount.toFixed(2)} será processado (taxa de deslocamento: R$ ${displacementFee.toFixed(2)}).`,
        action_url: '/minha-ficha',
      });
    }

    console.log(`✓ Recusa processada: Serviço ${service_request_id}, Estorno: R$ ${refundAmount.toFixed(2)}`);

    return Response.json({
      success: true,
      message: 'Recusa registrada com sucesso',
      refund_amount: refundAmount,
      displacement_fee: displacementFee,
    });

  } catch (error) {
    console.error('Erro ao processar recusa:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});