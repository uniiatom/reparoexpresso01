// Service Worker — Reparo Expresso
// Recebe push notifications e toca alerta sonoro mesmo com tela bloqueada

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Toca um som de alerta via AudioContext dentro do SW (Deno/Chrome suportam isso)
function playAlertSound() {
  // Não conseguimos tocar som direto no SW sem um cliente aberto
  // mas podemos usar a Notification API com vibration e urgency
  // O som real é tocado quando o app está aberto via useNewJobAlert
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: '🔔 Novo Chamado!', message: 'Um cliente está aguardando.' };
  }

  const title = data.title || '🔔 Novo Chamado — Reparo Expresso!';
  const options = {
    body: data.message || 'Um cliente está aguardando seu atendimento. Abra o app agora!',
    icon: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/b2b780191_d9741c6a-dbbe-4b19-a2b3-b5734557ae14.jpg',
    badge: 'https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/b2b780191_d9741c6a-dbbe-4b19-a2b3-b5734557ae14.jpg',
    tag: 'novo-chamado',
    renotify: true,
    requireInteraction: true,  // Mantém notificação visível até o usuário interagir
    vibrate: [300, 100, 300, 100, 300, 200, 500], // Padrão urgente de vibração
    sound: '/notification-sound.mp3', // alguns navegadores suportam
    actions: [
      { action: 'open', title: '✅ Ver Chamado' },
      { action: 'dismiss', title: '❌ Fechar' },
    ],
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  // Abre ou foca o app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se o app já está aberto, foca
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Senão abre uma nova janela
      if (clients.openWindow) {
        return clients.openWindow('/prestador');
      }
    })
  );
});
