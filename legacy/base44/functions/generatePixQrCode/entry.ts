import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requestId, amount } = await req.json();

    if (!requestId || !amount) {
      return Response.json({ error: 'Missing requestId or amount' }, { status: 400 });
    }

    // Get service request to extract merchant info
    const serviceRequest = await base44.entities.ServiceRequest.filter({ id: requestId });
    if (!serviceRequest || serviceRequest.length === 0) {
      return Response.json({ error: 'Service request not found' }, { status: 404 });
    }

    // Generate unique PIX ID (idempotencyKey) and copy key
    const pixId = `${requestId}-${Date.now()}`;
    const pixKey = `00020126360014br.gov.bcb.pix0136${pixId}`;
    
    // Format amount for PIX (without decimals for this simplified version)
    const amountFormatted = (amount * 100).toString().padStart(10, '0');
    
    // Generate QR Code data (simplified PIX format)
    const qrCodeData = `00020126360014br.gov.bcb.pix0136${pixId}5204000053039865802BR5913ME SOCORRO6009SAO PAULO62410503***63043D91`;

    // Store PIX payment info in the service request
    await base44.entities.ServiceRequest.update(requestId, {
      pix_key: pixKey,
      pix_id: pixId,
      pix_amount: amount,
      pix_created_at: new Date().toISOString(),
      pix_status: 'pending'
    });

    return Response.json({
      success: true,
      pixId,
      pixKey,
      amount,
      qrCodeData,
      expiresIn: 900 // 15 minutes
    });
  } catch (error) {
    console.error('PIX QR Code generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});