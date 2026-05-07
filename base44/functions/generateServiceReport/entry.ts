import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      request_id, 
      selectedParts = [], 
      laborCost = 0, 
      observations = '',
      additionalNotes = ''
    } = await req.json();

    if (!request_id) {
      return Response.json({ error: 'request_id é obrigatório' }, { status: 400 });
    }

    // Busca dados do serviço
    const serviceRequests = await base44.entities.ServiceRequest.filter({ id: request_id });
    if (!serviceRequests?.length) {
      return Response.json({ error: 'Serviço não encontrado' }, { status: 404 });
    }

    const service = serviceRequests[0];

    // Calcula totais
    const partsTotal = selectedParts.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const total = partsTotal + laborCost;

    // Formata data
    const date = new Date();
    const dateStr = date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });

    // Prepara HTML para o PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
          .container { padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { 
            border-bottom: 3px solid #2d8659; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
          }
          .title { font-size: 28px; font-weight: bold; color: #2d8659; margin-bottom: 10px; }
          .subtitle { font-size: 14px; color: #666; }
          .section { margin-bottom: 30px; }
          .section-title { 
            font-size: 16px; 
            font-weight: bold; 
            color: #2d8659;
            border-bottom: 2px solid #e0e0e0;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
          }
          .info-item { 
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
          }
          .info-label { 
            font-weight: bold; 
            color: #2d8659;
            font-size: 12px;
            text-transform: uppercase;
          }
          .info-value { 
            font-size: 14px; 
            color: #333;
            margin-top: 3px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background-color: #2d8659;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            border: none;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #e0e0e0;
          }
          tr:last-child td { border-bottom: none; }
          .amount { text-align: right; font-weight: bold; }
          .summary {
            background-color: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
          }
          .summary-row.total {
            border-top: 2px solid #2d8659;
            padding-top: 12px;
            margin-top: 12px;
            font-size: 18px;
            font-weight: bold;
            color: #2d8659;
          }
          .observations {
            background-color: #f9f9f9;
            padding: 15px;
            border-left: 4px solid #2d8659;
            margin-bottom: 20px;
            border-radius: 4px;
          }
          .observations-text {
            font-size: 13px;
            line-height: 1.6;
            color: #444;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
            font-size: 11px;
            color: #666;
            text-align: center;
          }
          .category-badge {
            display: inline-block;
            background-color: #e3f2fd;
            color: #1976d2;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
            margin-right: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="title">📋 Relatório de Serviço</div>
            <div class="subtitle">Solicitação #${service.service_number} • ${dateStr}</div>
          </div>

          <!-- Informações do Serviço -->
          <div class="section">
            <div class="section-title">Informações do Serviço</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Tipo de Serviço</div>
                <div class="info-value">${service.service_type}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Cliente</div>
                <div class="info-value">${service.client_name}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Contato</div>
                <div class="info-value">${service.client_phone}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Endereço</div>
                <div class="info-value">${service.address}${service.number ? ', ' + service.number : ''}, ${service.neighborhood} - ${service.city}, ${service.state}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Descrição</div>
                <div class="info-value">${service.description}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Data do Relatório</div>
                <div class="info-value">${dateStr}</div>
              </div>
            </div>
          </div>

          <!-- Peças e Materiais -->
          ${selectedParts.length > 0 ? `
            <div class="section">
              <div class="section-title">🔧 Peças e Materiais Utilizados</div>
              <table>
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th style="text-align: center;">Qtd.</th>
                    <th style="text-align: right;">Valor Unit.</th>
                    <th style="text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${selectedParts.map(item => `
                    <tr>
                      <td>${item.name}</td>
                      <td><span class="category-badge">${item.category === 'material' ? '🔩 Material' : '👨‍🔧 Serviço'}</span></td>
                      <td style="text-align: center;">${item.quantity}</td>
                      <td class="amount">R$ ${item.unit_price.toFixed(2)}</td>
                      <td class="amount">R$ ${(item.unit_price * item.quantity).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          <!-- Mão de Obra -->
          ${laborCost > 0 ? `
            <div class="section">
              <div class="section-title">👨‍🔧 Mão de Obra</div>
              <div class="summary">
                <div class="summary-row">
                  <span>Custo de Mão de Obra:</span>
                  <span>R$ ${laborCost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Observações -->
          ${observations ? `
            <div class="section">
              <div class="section-title">📝 Observações do Prestador</div>
              <div class="observations">
                <div class="observations-text">${observations.split('\n').join('<br>')}</div>
              </div>
            </div>
          ` : ''}

          ${additionalNotes ? `
            <div class="section">
              <div class="section-title">📌 Notas Adicionais</div>
              <div class="observations">
                <div class="observations-text">${additionalNotes.split('\n').join('<br>')}</div>
              </div>
            </div>
          ` : ''}

          <!-- Resumo Financeiro -->
          <div class="section">
            <div class="section-title">💰 Resumo Financeiro</div>
            <div class="summary">
              ${selectedParts.length > 0 ? `
                <div class="summary-row">
                  <span>Subtotal em Peças/Materiais:</span>
                  <span>R$ ${partsTotal.toFixed(2)}</span>
                </div>
              ` : ''}
              ${laborCost > 0 ? `
                <div class="summary-row">
                  <span>Mão de Obra:</span>
                  <span>R$ ${laborCost.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="summary-row total">
                <span>TOTAL:</span>
                <span>R$ ${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p>Relatório gerado automaticamente pelo sistema de gerenciamento de serviços.</p>
            <p>Data: ${dateStr} • ID do Serviço: ${request_id}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Usa InvokeLLM para gerar PDF (convertendo HTML para PDF via backend)
    // Como alternativa, retorna o HTML para o frontend gerar o PDF
    const htmlBase64 = btoa(unescape(encodeURIComponent(htmlContent)));

    console.log(`✅ Relatório de serviço gerado para ${request_id}`);

    return Response.json({ 
      success: true,
      html: htmlContent,
      htmlBase64: htmlBase64,
      totalAmount: total,
      partsTotal: partsTotal,
      laborCost: laborCost
    });
  } catch (error) {
    console.error('❌ Erro ao gerar relatório:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});