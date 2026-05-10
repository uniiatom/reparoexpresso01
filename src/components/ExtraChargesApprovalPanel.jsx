import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ExtraChargesApprovalPanel({ service, onApprovalChange }) {
  const [loading, setLoading] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [localService, setLocalService] = useState(service);
  const [notification, setNotification] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [showConfirmApprove, setShowConfirmApprove] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

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

  // Se não houver notificação pendente, não mostra nada
  if (!notification) {
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
    <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 space-y-3 mb-5">
      {/* Header colapsável */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 hover:opacity-80 transition-opacity"
      >
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 text-left min-w-0">
          <p className="font-bold text-amber-900">💰 Orçamento extra aguardando aprovação</p>
          <p className="text-sm text-amber-800 mt-0.5">{notification.provider_name} solicitou +R$ {total.toFixed(2)}</p>
        </div>
        <span className={`text-amber-600 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Detalhes expandidos - Cliente */}
      {expanded && user?.role === 'user' && (
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
            <p className="text-xs font-semibold text-blue-900 mb-1">📝 Informações do prestador:</p>
            <p className="text-sm text-blue-800">{notification.message || 'Solicitação de orçamento extra para completar o serviço.'}</p>
          </div>
        </div>
      )}

      {/* Detalhes expandidos - Prestador */}
      {expanded && user?.role === 'admin' && (
        <div className="space-y-3 border-t border-amber-200 pt-3">
          {/* Tabela de materiais */}
          <div className="bg-white rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground mb-3">🔧 Materiais e Serviços:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 text-xs font-semibold text-muted-foreground">Descrição</th>
                    <th className="text-center p-2 text-xs font-semibold text-muted-foreground">Qtd</th>
                    <th className="text-right p-2 text-xs font-semibold text-muted-foreground">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {notification.message && (
                    <tr className="border-b border-border hover:bg-amber-50">
                      <td className="p-2 text-foreground">{notification.message}</td>
                      <td className="p-2 text-center text-muted-foreground">—</td>
                      <td className="p-2 text-right font-semibold text-foreground">R$ {total.toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 mt-2">
              + Adicionar material
            </button>
          </div>

          {/* Mão de obra */}
          <div className="bg-white rounded-2xl p-4">
            <p className="text-sm font-semibold text-foreground mb-3">👷 Mão de Obra:</p>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Descrição (ex: Instalação de kit ar condicionado)"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Horas"
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <input
                  type="number"
                  placeholder="Valor/hora"
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Resumo total */}
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor original:</span>
              <span className="font-semibold">R$ {originalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-amber-200 pt-2">
              <span className="text-muted-foreground">+ Materiais:</span>
              <span className="font-bold text-amber-700">+ R$ {total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t-2 border-amber-300 pt-3">
              <span className="text-amber-900">Novo total:</span>
              <span className="text-amber-700">R$ {new_total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Menu de ações - Cliente (apenas aprovar/rejeitar) */}
      {expanded && !showRejectionForm && !showConfirmApprove && user?.role === 'user' && (
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

      {/* Menu de ações - Prestador (todas as opções) */}
      {expanded && !showRejectionForm && !showConfirmApprove && user?.role === 'admin' && (
        <div className="space-y-2 pt-2 border-t border-amber-200">
          <p className="text-xs font-semibold text-amber-900 px-1">Opções disponíveis:</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => setShowConfirmApprove(true)}
              className="rounded-2xl bg-green-600 hover:bg-green-700 text-white h-10 font-semibold text-xs flex flex-col items-center gap-1"
              disabled={loading}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Aprovar</span>
            </Button>
            <Button
              onClick={() => setSelectedAction('negotiate')}
              variant="outline"
              className="rounded-2xl border-blue-300 text-blue-600 hover:bg-blue-50 h-10 font-semibold text-xs flex flex-col items-center gap-1"
              disabled={loading}
            >
              <span>💬</span>
              <span>Negociar</span>
            </Button>
            <Button
              onClick={() => setSelectedAction('clarify')}
              variant="outline"
              className="rounded-2xl border-purple-300 text-purple-600 hover:bg-purple-50 h-10 font-semibold text-xs flex flex-col items-center gap-1"
              disabled={loading}
            >
              <span>❓</span>
              <span>Esclarecer</span>
            </Button>
            <Button
              onClick={() => setShowRejectionForm(true)}
              variant="outline"
              className="rounded-2xl border-red-300 text-red-600 hover:bg-red-50 h-10 font-semibold text-xs flex flex-col items-center gap-1"
              disabled={loading}
            >
              <XCircle className="w-4 h-4" />
              <span>Rejeitar</span>
            </Button>
          </div>
        </div>
      )}

      {/* Ação: Negociar */}
      {selectedAction === 'negotiate' && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-blue-900">💬 Propor um novo valor</p>
          <div className="space-y-2">
            <input
              type="number"
              placeholder="Novo valor total (ex: 250)"
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              defaultValue={new_total}
            />
            <textarea
              placeholder="Deixe uma mensagem para o prestador..."
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => setSelectedAction(null)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              disabled={loading}
            >
              Enviar Proposta
            </Button>
          </div>
        </div>
      )}

      {/* Ação: Esclarecer */}
      {selectedAction === 'clarify' && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-purple-900">❓ Sua dúvida ou questionamento</p>
          <textarea
            placeholder="Qual é sua dúvida sobre este orçamento extra?"
            className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => setSelectedAction(null)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              disabled={loading}
            >
              Enviar Dúvida
            </Button>
          </div>
        </div>
      )}



      {/* Formulário de rejeição */}
      {showRejectionForm && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-red-900">❌ Por que está rejeitando?</p>
          <textarea
            placeholder="Explique o motivo da rejeição..."
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
              Confirmar Rejeição
            </Button>
          </div>
        </div>
      )}

      {/* Modal de confirmação de aprovação */}
      {showConfirmApprove && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-green-900">✓ Confirmar aprovação?</p>
          <p className="text-sm text-green-800">
            Você está aprovando um adicional de <strong>R$ {total.toFixed(2)}</strong>, levando o total para <strong>R$ {new_total.toFixed(2)}</strong>.
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
              Sim, Aprovar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}