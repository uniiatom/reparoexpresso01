import { useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';

export function usePushNotifications() {
  const { addNotification } = useNotifications();

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  };

  const sendNotification = (title, options = {}) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/logo.png',
        badge: '/logo.png',
        ...options,
      });

      // Close notification after 5 seconds
      if (options.autoClose !== false) {
        setTimeout(() => notification.close(), 5000);
      }

      return notification;
    }
  };

  const notifyStatusChange = (status, providerName, requestId) => {
    const messages = {
      aceito: `${providerName} aceitou seu pedido!`,
      a_caminho: `${providerName} está a caminho!`,
      em_andamento: 'Serviço em andamento',
      concluido: 'Serviço concluído!',
      cancelado: 'Serviço foi cancelado',
    };

    if (messages[status]) {
      addNotification({
        type: 'status',
        title: 'Atualização de Status',
        message: messages[status],
        requestId,
      });

      sendNotification(messages[status], {
        tag: `status-${requestId}`,
        requireInteraction: false,
      });
    }
  };

  const notifyNewMessage = (senderName) => {
    addNotification({
      type: 'message',
      title: 'Nova Mensagem',
      message: `${senderName} enviou uma mensagem`,
    });

    sendNotification(`Mensagem de ${senderName}`, {
      tag: 'new-message',
    });
  };

  const notifyScheduleReminder = (date, time, serviceName) => {
    addNotification({
      type: 'reminder',
      title: '⏰ Lembrete de Agendamento',
      message: `${serviceName} agendado para ${date} às ${time}`,
    });

    sendNotification(`Lembrete: ${serviceName} em ${date}`, {
      tag: 'schedule-reminder',
      requireInteraction: true,
    });
  };

  return {
    requestPermission,
    sendNotification,
    notifyStatusChange,
    notifyNewMessage,
    notifyScheduleReminder,
  };
}