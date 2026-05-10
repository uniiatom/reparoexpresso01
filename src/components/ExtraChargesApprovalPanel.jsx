import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import PhotoUploadGallery from './PhotoUploadGallery';

export default function ExtraChargesApprovalPanel({ service, onApprovalChange }) {
  const [loading, setLoading] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [localService, setLocalService] = useState(service);
  const [notification, setNotification] = useState(null);
  const [expanded, setExpanded] = useState(null); // null = auto, true = aberto, false = fechado
  const [showConfirmApprove, setShowConfirmApprove] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [user, setUser] = useState(null);
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Abre automaticamente expandido para clientes
  const shouldExpand = useMemo(() => {
    if (expanded !== null) return expanded;
    return notification && user && user.role !== 'admin'; // auto-abre para clientes
  }, [expanded, notification, user]);

  // Atualiza em tempo real quando o service muda
  useEffect(() => {
    setLocalService(service);
  }, [service]);

  // Busca notificação de orçamento extra para este serviço
  useEffect(() => {
    if (!service?.id) return;
    base44.entities.ClientNotification.filter(
      { service_id: service.id, type: 'extra_charges_pending', is_read: false },
      '-created_date',
      1
    ).then(notifs => {
      if (notifs[0]) {
        console.log('[ExtraChargesApprovalPanel] Found notification:', notifs[0]);
        setNotification(notifs[0]);
      }
    }).catch(e => console.warn('[ExtraChargesApprovalPanel] Error fetching notification:', e.message));
  }, [service?.id]);

  const isProvider = user?.role === 'admin';
  
  if (!isProvider && !notification) {
    return null;
  }

  const total = notification.extra_total || 0;
  const new_total = notification.new_total || 0;
  const originalPrice = localService.final_price || localService.estimated_price || 0;

  const handleApprove = async () => {
    setLoading(true);
    try {
      // Marca a notificação como lida
      if (notification?.id) {
        await base44.entities.ClientNotification.update(notification.id, { is_read: true });
      }

      await base44.functions.invoke('approveExtraCharges', {
        service_id: localService.id,
        provider_id: localService.provider_id,
        provider_name: localService.provider_name,
        client_name: localService.client_name,
        original_price: originalPrice,
        extra_charges_total: total,
        new_total: new_total,
      });

      // Registra no histórico
      await base44.functions.invoke('recordPriceHistory', {
        service_id: localService.id,
        service_number: localService.service_number,
        event_type: 'extra_charges_approved',
        previous_price: originalPrice,
        new_price: new_total,
        extra_charges_total: total,
        reason: notification.message,
        status: 'approved',
      });

      toast.success('Orçamento aprovado! O prestador foi notificado.');
      setNotification(null);
      setShowConfirmApprove(false);
      onApprovalChange?.();
    } catch (error) {
      console.error('Erro ao aprovar:', error);
      toast.error('Erro ao aprovar orçamento');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionNotes.trim()) {
      toast.error('Informe um motivo para a rejeição');
      return;
    }

    setLoading(true);
    try {
      // Marca a notificação como lida
      if (notification?.id) {
        await base44.entities.ClientNotification.update(notification.id, { is_read: true });
      }

      await base44.functions.invoke('rejectExtraCharges', {
        service_id: localService.id,
        provider_id: localService.provider_id,
        provider_name: localService.provider_name,
        client_name: localService.client_name,
        rejection_notes: rejectionNotes,
      });

      // Registra no histórico
      await base44.functions.invoke('recordPriceHistory', {
        service_id: localService.id,
        service_number: localService.service_number,
        event_type: 'extra_charges_rejected',
        previous_price: originalPrice,
        new_price: originalPrice,
        extra_charges_total: total,
        notes: rejectionNotes,
        status: 'rejected',
      });

      toast.success('Orçamento rejeitado. O prestador foi notificado.');
      setNotification(null);
      onApprovalChange?.();
    } catch (error) {
      console.error('Erro ao rejeitar:', error);
      toast.error('Erro ao rejeitar orçamento');
    } finally {
      setLoading(false);
      setShowRejectionForm(false);
      setRejectionNotes('');
    }
  };

  return (
    <div className={`rounded-3xl p-5 space-y-3 mb-5 border-2 ${
      isProvider 
        ? 'bg-blue-50 border-blue-300' 
        : 'bg-amber-50 border-amber-300'
    }`}>
      {/* Header colapsável */}
      <button
        onClick={() => setExpanded(!shouldExpand)}
        className="w-full flex items-start gap-3 hover:opacity-80 transition-opacity"
      >
        <span className={`text-xl flex-shrink-0 ${isProvider ? '🔧' : '💰'}`} />
        <div className="flex-1 text-left min-w-0">
          <p className={`font-bold ${isProvider ? 'text-blue-900' : 'text-amber-900'}`}>
            {isProvider 
              ? '🔧 Adicionar orçamento extra' 
              : '💰 Orçamento extra aguardando aprovação'}
          </p>
          {notification && !isProvider && (
            <p className="text-sm text-amber-800 mt-0.5">{notification.provider_name} solicitou +R$ {total.toFixed(2)}</p>
          )}
        </div>
        <span className={`flex-shrink-0 transition-transform ${shouldExpand ? 'rotate-180' : ''} ${isProvider ? 'text-blue-600' : 'text-amber-600'}`}>
          ▼
        </span>
      </button>



      {/* Detalhes expandidos - Cliente (apenas aprovação/rejeição) */}
      {shouldExpand && !isProvider && notification && (
        <div className="space-y-3 border-t border-amber-200 pt-3">
          <div className="bg-white rounded-2xl p-4 space-y-2">
            <p className="text-sm font-semibold text-foreground mb-3">📊 Resumo financeiro:</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor original:</span>
              <span className="font-semibold text-foreground">R$ {originalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-border pt-2">
              <span className="text-muted-foreground">+ Itens extras:</span>
              <span className="font-bold text-amber-700">+ R$ {total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t-2 border-amber-300 pt-3">
              <span className="text-amber-900">Novo total:</span>
              <span className="text-amber-700">R$ {new_total.toFixed(2)}</span>
            </div>
          </div>

          {/* Mensagem do prestador */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
            <p className="text-xs font-semibold text-blue-900 mb-1">📝 Solicitação do prestador:</p>
            <p className="text-sm text-blue-800">{notification.message || 'Orçamento extra solicitado pelo prestador.'}</p>
          </div>


        </div>
      )}



      {/* Menu de ações - Cliente (apenas aprovar/rejeitar) */}
      {shouldExpand && !showRejectionForm && !showConfirmApprove && !isProvider && notification && (
        <div className="space-y-2 pt-2 border-t border-amber-200">
          <p className="text-xs font-semibold text-amber-900 px-1">O que você quer fazer?</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => setShowConfirmApprove(true)}
              className="rounded-2xl bg-green-600 hover:bg-green-700 text-white h-10 font-semibold text-sm"
              disabled={loading}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Aprovar
            </Button>
            <Button
              onClick={() => setShowRejectionForm(true)}
              variant="outline"
              className="rounded-2xl border-red-300 text-red-600 hover:bg-red-50 h-10 font-semibold text-sm"
              disabled={loading}
            >
              <XCircle className="w-4 h-4 mr-1.5" /> Rejeitar
            </Button>
          </div>
        </div>
      )}







      {/* Formulário de cancelamento (prestador) ou rejeição (cliente) */}
      {showRejectionForm && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-red-900">❌ {isProvider ? 'Cancelar orçamento?' : 'Por que está rejeitando?'}</p>
          <textarea
           placeholder={isProvider ? 'Motivo do cancelamento...' : 'Explique o motivo da rejeição...'}
           value={rejectionNotes}
           onChange={(e) => setRejectionNotes(e.target.value)}
           className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-400 resize-none"
           rows={3}
           autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => {
                setShowRejectionForm(false);
                setRejectionNotes('');
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold"
              onClick={handleReject}
              disabled={loading || !rejectionNotes.trim()}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
              {isProvider ? 'Cancelar' : 'Rejeitar'}
            </Button>
          </div>
        </div>
      )}

      {/* Modal de confirmação */}
      {showConfirmApprove && isProvider && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-green-900">✓ Confirmar envio do orçamento?</p>
          <p className="text-sm text-green-800">
            Você está enviando um adicional de <strong>R$ {total.toFixed(2)}</strong>, totalizando <strong>R$ {new_total.toFixed(2)}</strong> para aprovação do cliente.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => setShowConfirmApprove(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold"
              onClick={handleApprove}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Sim, Enviar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}