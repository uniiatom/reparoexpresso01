import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AttendantPushBanner() {
  const [permission, setPermission] = useState('default');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  if (!('Notification' in window)) return null;
  if (permission === 'granted') return null;
  if (permission === 'denied') return null;
  if (dismissed) return null;

  return (
    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-3 text-sm">
      <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
        <Bell className="w-4 h-4 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-blue-900 text-xs">Ativar notificações do navegador</p>
        <p className="text-blue-700 text-xs">Receba alertas mesmo com a aba em segundo plano.</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button size="sm" onClick={requestPermission} className="rounded-xl text-xs h-7 px-3">
          Ativar
        </Button>
        <button onClick={() => setDismissed(true)} className="p-1 hover:bg-blue-100 rounded-lg">
          <X className="w-3.5 h-3.5 text-blue-500" />
        </button>
      </div>
    </div>
  );
}