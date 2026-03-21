import { useEffect, useRef } from 'react';

const NOTIFICATION_CONFIG = {
  aceito: {
    title: '✅ Prestador confirmou!',
    body: 'Seu pedido foi aceito e o prestador está se preparando.',
    icon: '✅',
  },
  a_caminho: {
    title: '🚗 Prestador a caminho!',
    body: 'O prestador já saiu para te atender. Acompanhe em tempo real.',
    icon: '🚗',
  },
  concluido: {
    title: '🎉 Serviço concluído!',
    body: 'O prestador finalizou o trabalho. Avalie a experiência!',
    icon: '🎉',
  },
};

const NOTIFICATION_SOUNDS = {
  aceito: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==',
  a_caminho: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==',
  concluido: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==',
};

export function useServiceNotifications(request, previousStatus) {
  const statusRef = useRef(previousStatus);
  const notificationShownRef = useRef(new Set());

  useEffect(() => {
    if (!request || !request.status) return;

    // Check if status changed
    if (statusRef.current === request.status) return;

    // Prevent duplicate notifications
    const notificationKey = `${request.id}-${request.status}`;
    if (notificationShownRef.current.has(notificationKey)) return;

    // Only show for specific statuses
    if (!NOTIFICATION_CONFIG[request.status]) {
      statusRef.current = request.status;
      return;
    }

    // Request permission if needed
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showNotification(request, request.status, notificationKey);
        }
      });
    } else if (Notification.permission === 'granted') {
      showNotification(request, request.status, notificationKey);
    }

    statusRef.current = request.status;
  }, [request?.status, request?.id]);

  function showNotification(request, status, key) {
    const config = NOTIFICATION_CONFIG[status];
    if (!config) return;

    // Browser notification
    new Notification(config.title, {
      body: config.body,
      icon: '/favicon.ico',
      tag: `service-${request.id}`,
      requireInteraction: false,
      badge: '🔔',
    });

    // Mark as shown
    notificationShownRef.current.add(key);

    // Play sound (optional, subtle)
    try {
      const audio = new Audio();
      audio.src = NOTIFICATION_SOUNDS[status] || NOTIFICATION_SOUNDS.aceito;
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (err) {
      // Silently fail if audio can't play
    }
  }

  // Request permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Don't auto-request, wait for user interaction
    }
  }, []);
}