import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { serviceRequestId } = await req.json();

    if (!serviceRequestId) {
      return Response.json({ error: 'serviceRequestId é obrigatório' }, { status: 400 });
    }

    // Busca o serviço
    const service = await base44.entities.ServiceRequest.get(serviceRequestId);
    if (!service) {
      return Response.json({ error: 'Serviço não encontrado' }, { status: 404 });
    }

    // Se já tem garantia definida, não sobrescreve
    if (service.warranty_end_date && service.warranty_status === 'ativa') {
      return Response.json({
        message: 'Garantia já estava definida',
        warranty_end_date: service.warranty_end_date,
      });
    }

    // Calcula data de término: 90 dias a partir de agora
    const warrantyEndDate = new Date();
    warrantyEndDate.setDate(warrantyEndDate.getDate() + 90);

    // Atualiza o serviço com a garantia
    await base44.entities.ServiceRequest.update(serviceRequestId, {
      warranty_end_date: warrantyEndDate.toISOString(),
      warranty_status: 'ativa',
    });

    return Response.json({
      success: true,
      warranty_end_date: warrantyEndDate.toISOString(),
      warranty_days: 90,
      message: 'Garantia de 90 dias ativada com sucesso',
    });
  } catch (error) {
    console.error('Erro ao definir garantia:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});