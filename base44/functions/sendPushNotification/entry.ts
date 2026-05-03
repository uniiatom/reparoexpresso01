import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// VAPID keys — geradas fixas para o app
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_SUBJECT = 'mailto:contato@reparoexpresso.com';

// Converte base64url para Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// Gera assinatura JWT para VAPID
async function generateVapidJWT(audience) {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: VAPID_SUBJECT,
  };

  const encode = (obj) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signingInput = `${encode(header)}.${encode(payload)}`;

  // Importa chave privada VAPID (formato pkcs8 raw)
  const privateKeyBytes = urlBase64ToUint8Array(VAPID_PRIVATE_KEY);
  
  // A chave privada VAPID é um raw EC private key de 32 bytes
  // Precisamos convertê-la para PKCS#8 DER
  const pkcs8Header = new Uint8Array([
    0x30, 0x41, // SEQUENCE
    0x02, 0x01, 0x00, // INTEGER 0 (version)
    0x30, 0x13, // SEQUENCE (AlgorithmIdentifier)
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // OID ecPublicKey
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, // OID P-256
    0x04, 0x27, // OCTET STRING
    0x30, 0x25, // SEQUENCE
    0x02, 0x01, 0x01, // INTEGER 1
    0x04, 0x20, // OCTET STRING (32 bytes)
  ]);
  
  const pkcs8Key = new Uint8Array(pkcs8Header.length + 32);
  pkcs8Key.set(pkcs8Header);
  pkcs8Key.set(privateKeyBytes.slice(0, 32), pkcs8Header.length);

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8Key,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    encoder.encode(signingInput)
  );

  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${signingInput}.${sigBase64}`;
}

// Envia Web Push para uma subscription
async function sendWebPush(subscription, payload) {
  const endpoint = subscription.endpoint;
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const jwt = await generateVapidJWT(audience);
  const vapidHeader = `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`;

  const body = JSON.stringify(payload);
  const encoder = new TextEncoder();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': vapidHeader,
      'Content-Type': 'application/json',
      'TTL': '86400',
    },
    body: encoder.encode(body),
  });

  return response.status;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { providerId, title, message, data } = body;

    if (!providerId) {
      return Response.json({ error: 'providerId obrigatório' }, { status: 400 });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.error('[Push] VAPID keys não configuradas');
      return Response.json({ error: 'VAPID não configurado' }, { status: 500 });
    }

    // Busca o prestador para pegar a push_subscription
    const provider = await base44.asServiceRole.entities.Provider.get(providerId);
    if (!provider?.push_subscription) {
      console.log('[Push] Prestador sem push subscription:', providerId);
      return Response.json({ skipped: true, reason: 'sem subscription' });
    }

    const subscription = JSON.parse(provider.push_subscription);

    const statusCode = await sendWebPush(subscription, {
      title: title || '🔔 Novo Chamado!',
      message: message || 'Um cliente está aguardando seu atendimento.',
      data: data || {},
    });

    console.log(`[Push] Enviado para ${provider.name} — status: ${statusCode}`);

    if (statusCode === 410 || statusCode === 404) {
      // Subscription expirada — remove do banco
      await base44.asServiceRole.entities.Provider.update(providerId, { push_subscription: null });
      console.log('[Push] Subscription expirada removida.');
    }

    return Response.json({ success: true, statusCode });
  } catch (error) {
    console.error('[Push] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});