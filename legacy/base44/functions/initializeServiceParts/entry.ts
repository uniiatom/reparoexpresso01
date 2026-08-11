import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Peças padrão por tipo de serviço
const DEFAULT_PARTS = {
  eletrica: [
    { name: 'Disjuntor (un)', unit: 'un', unit_price: 45.00, category: 'material' },
    { name: 'Tomada dupla (un)', unit: 'un', unit_price: 12.00, category: 'material' },
    { name: 'Interruptor simples (un)', unit: 'un', unit_price: 8.50, category: 'material' },
    { name: 'Fio 2,5mm² (m)', unit: 'm', unit_price: 1.20, category: 'material' },
    { name: 'Instalação de ponto (un)', unit: 'un', unit_price: 35.00, category: 'servico' },
  ],
  hidraulica: [
    { name: 'Torneira de parede (un)', unit: 'un', unit_price: 85.00, category: 'material' },
    { name: 'Registro de esfera (un)', unit: 'un', unit_price: 28.00, category: 'material' },
    { name: 'Tubo PVC 25mm (m)', unit: 'm', unit_price: 8.50, category: 'material' },
    { name: 'Joelho 90° (un)', unit: 'un', unit_price: 3.50, category: 'material' },
    { name: 'Instalação de ponto (un)', unit: 'un', unit_price: 60.00, category: 'servico' },
  ],
  desentupimento: [
    { name: 'Desentupidor manual (un)', unit: 'un', unit_price: 25.00, category: 'material' },
    { name: 'Soda cáustica (kg)', unit: 'kg', unit_price: 35.00, category: 'material' },
    { name: 'Serviço com mola (m)', unit: 'm', unit_price: 70.00, category: 'servico' },
  ],
  ar_condicionado: [
    { name: 'Filtro de ar (un)', unit: 'un', unit_price: 45.00, category: 'material' },
    { name: 'Gás refrigerante R410A (kg)', unit: 'kg', unit_price: 120.00, category: 'material' },
    { name: 'Recarga de gás (un)', unit: 'un', unit_price: 150.00, category: 'servico' },
    { name: 'Limpeza completa (un)', unit: 'un', unit_price: 80.00, category: 'servico' },
  ],
  limpeza_caixa_dagua: [
    { name: 'Cloro em pó (kg)', unit: 'kg', unit_price: 15.00, category: 'material' },
    { name: 'Selante impermeável (l)', unit: 'l', unit_price: 85.00, category: 'material' },
    { name: 'Inspeção interna (un)', unit: 'un', unit_price: 50.00, category: 'servico' },
  ],
  reparo_forro_gesso: [
    { name: 'Placa de gesso (m2)', unit: 'm2', unit_price: 35.00, category: 'material' },
    { name: 'Massa acrílica (kg)', unit: 'kg', unit_price: 12.00, category: 'material' },
    { name: 'Tinta acrílica (l)', unit: 'l', unit_price: 28.00, category: 'material' },
    { name: 'Aplicação de massa/tinta (m2)', unit: 'm2', unit_price: 25.00, category: 'servico' },
  ],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verifica se peças já foram inicializadas
    const existingParts = await base44.entities.ServicePart.list();
    if (existingParts?.length > 0) {
      return Response.json({ 
        message: 'Peças já foram inicializadas',
        count: existingParts.length 
      });
    }

    // Cria peças padrão para cada tipo de serviço
    const partsToCreate = [];
    for (const [serviceType, parts] of Object.entries(DEFAULT_PARTS)) {
      for (const part of parts) {
        partsToCreate.push({
          service_type: serviceType,
          name: part.name,
          unit: part.unit,
          unit_price: part.unit_price,
          category: part.category,
          is_active: true,
        });
      }
    }

    // Bulk create em lotes (25 por vez)
    const BATCH_SIZE = 25;
    let created = 0;

    for (let i = 0; i < partsToCreate.length; i += BATCH_SIZE) {
      const batch = partsToCreate.slice(i, i + BATCH_SIZE);
      await base44.entities.ServicePart.bulkCreate(batch);
      created += batch.length;
    }

    console.log(`✅ ${created} peças criadas com sucesso`);

    return Response.json({ 
      success: true, 
      message: `${created} peças inicializadas`,
      count: created 
    });
  } catch (error) {
    console.error('❌ Erro ao inicializar peças:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});