import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addNotification = useCallback((notification) => {
    const id = Date.now().toString();
    const newNotification = {
      id,
      timestamp: new Date(),
      read: false,
      ...notification,
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 50));
    setUnreadCount(prev => prev + 1);
    return id;
  }, []);

  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Real-time subscriptions for service request updates
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribeRequests = window.base44?.entities?.ServiceRequest?.subscribe?.((event) => {
      const { type, data } = event;
      
      // Notify clients about status changes
      if (type === 'update' && (data?.client_id === user.id || data?.created_by === user.email)) {
        const statusMessages = {
          aceito: `✅ Seu pedido foi aceito por ${data.provider_name}!`,
          a_caminho: `🚗 ${data.provider_name} está a caminho!`,
          em_andamento: `⏳ Serviço em andamento com ${data.provider_name}`,
          concluido: `✨ Serviço concluído! Avalie o prestador`,
          cancelado: '❌ Serviço foi cancelado',
        };

        if (statusMessages[data.status]) {
          addNotification({
            type: 'status',
            title: 'Atualização de Status',
            message: statusMessages[data.status],
            requestId: data.id,
            data,
          });
        }
      }

      // Notify providers about new requests
      if (type === 'create' && data?.service_type) {
        addNotification({
          type: 'new_request',
          title: '🔔 Novo Chamado Disponível',
          message: `Nova solicitação de ${data.service_type} em ${data.city || data.address}`,
          requestId: data.id,
          data,
        });
      }
    });

    return () => {
      unsubscribeRequests?.();
    };
  }, [user?.id, addNotification]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearNotification,
      clearAll,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};