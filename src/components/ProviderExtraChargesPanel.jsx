import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import PhotoUploadGallery from './PhotoUploadGallery';

export default function ProviderExtraChargesPanel({ service, onApprovalChange }) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showConfirmApprove, setShowConfirmApprove] = useState(false);
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [cancellationNotes, setCancellationNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [items, setItems] = useState([
    { id: 1, description: '', quantity: 1, value: 0 }
  ]);
  const [laborDescription, setLaborDescription] = useState('');
  const [laborHours, setLaborHours] = useState('');
  const [laborRate, setLaborRate] = useState('');

  const originalPrice = service?.final_price || service?.estimated_price || 0;
  
  // Calcula total de materiais
  const materialTotal = items.reduce((sum, item) => sum + (item.value || 0), 0);
  
  // Calcula total de mão de obra
  const laborTotal = laborHours && laborRate ? parseFloat(laborHours) * parseFloat(laborRate) : 0;
  
  // Total de extras
  const totalExtras = materialTotal + laborTotal;
  const newTotal = originalPrice + totalExtras;

  const addItem = () => {
    setItems([...items, { 
      id: Math.max(...items.map(i => i.id), 0) + 1, 
      description: '', 
      quantity: 1, 
      value: 0 
    }]);
  };

  const removeItem = (id) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleApprove = async () => {
    if (totalExtras <= 0) {
      toast.error('Adicione pelo menos um item de orçamento extra');
      return;
    }

    setLoading(true);
    try {
      await base44.functions.invoke('sendExtraChargesRequest', {
        service_id: service.id,
        provider_id: service.provider_id,
        provider_name: service.provider_name,
        client_name: service.client_name,
        original_price: originalPrice,
        material_total: materialTotal,
        labor_total: laborTotal,
        extra_charges_total: totalExtras,
        new_total: newTotal,
        items: items.filter(i => i.description && i.value > 0),
        labor: laborDescription ? {
          description: laborDescription,
          hours: parseFloat(laborHours),
          rate: parseFloat(laborRate),
          total: laborTotal
        } : null,
        photos: photos,
      });

      // Registra no histórico
      await base44.functions.invoke('recordPriceHistory', {
        service_id: service.id,
        service_number: service.service_number,
        event_type: 'extra_charges_requested',
        previous_price: originalPrice,
        new_price: newTotal,
        extra_charges_total: totalExtras,
        reason: `Materiais: R$ ${materialTotal.toFixed(2)} + Mão de obra: R$ ${laborTotal.toFixed(2)}`,
        status: 'pending',
      });

      toast.success('Orçamento extra enviado para o cliente!');
      setExpanded(false);
      setShowConfirmApprove(false);
      setItems([{ id: 1, description: '', quantity: 1, value: 0 }]);
      setLaborDescription('');
      setLaborHours('');
      setLaborRate('');
      setPhotos([]);
      onApprovalChange?.();
    } catch (error) {
      console.error('Erro ao enviar orçamento:', error);
      toast.error('Erro ao enviar orçamento extra');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancellationNotes.trim()) {
      toast.error('Informe um motivo');
      return;
    }

    setLoading(true);
    try {
      // Apenas registra no histórico sem enviar ao cliente
      await base44.functions.invoke('recordPriceHistory', {
        service_id: service.id,
        service_number: service.service_number,
        event_type: 'extra_charges_rejected',
        previous_price: originalPrice,
        new_price: originalPrice,
        notes: cancellationNotes,
        status: 'rejected',
      });

      toast.success('Cancelamento registrado');
      setShowRejectionForm(false);
      setCancellationNotes('');
      setExpanded(false);
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      toast.error('Erro ao registrar cancelamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl p-5 space-y-3 mb-5 border-2 bg-blue-50 border-blue-300">
      {/* Header colapsável */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 hover:opacity-80 transition-opacity"
      >
        <span className="text-xl flex-shrink-0">🔧</span>
        <div className="flex-1 text-left min-w-0">
          <p className="font-bold text-blue-900">Adicionar orçamento extra</p>
          <p className="text-sm text-blue-800 mt-0.5">Materiais, mão de obra e serviços adicionais</p>
        </div>
        <span className={`flex-shrink-0 transition-transform text-blue-600 ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Conteúdo expandido */}
      {expanded && !showRejectionForm && !showConfirmApprove && (
        <div className="space-y-3 border-t border-blue-200 pt-3">
          {/* Upload de fotos */}
          <div className="bg-white rounded-2xl p-4 border border-blue-100">
            <PhotoUploadGallery 
              photos={photos} 
              onPhotosChange={setPhotos}
              readOnly={false}
            />
          </div>

          {/* Tabela de materiais */}
          <div className="bg-white rounded-2xl p-4 space-y-3 border border-blue-100">
            <p className="text-sm font-semibold text-foreground">🛠️ Materiais e Serviços:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 text-xs font-semibold text-muted-foreground">Descrição</th>
                    <th className="text-center p-2 text-xs font-semibold text-muted-foreground">Qtd</th>
                    <th className="text-right p-2 text-xs font-semibold text-muted-foreground">Valor</th>
                    <th className="text-center p-2 text-xs font-semibold text-muted-foreground">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-border hover:bg-blue-50">
                      <td className="p-2">
                        <input
                          type="text"
                          placeholder="Ex: Tubo PVC 50mm"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-12 rounded-lg border border-border bg-background px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={item.value || ''}
                          onChange={(e) => updateItem(item.id, 'value', parseFloat(e.target.value) || 0)}
                          className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-xs text-red-600 hover:text-red-700 font-semibold"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={addItem}
              className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 mt-2"
            >
              <Plus className="w-4 h-4" /> Adicionar material
            </button>
          </div>

          {/* Mão de obra */}
          <div className="bg-white rounded-2xl p-4 border border-blue-100">
            <p className="text-sm font-semibold text-foreground mb-3">👷 Mão de Obra:</p>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Descrição (ex: Instalação de ar condicionado)"
                value={laborDescription}
                onChange={(e) => setLaborDescription(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="Horas"
                  value={laborHours}
                  onChange={(e) => setLaborHours(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="R$ por hora"
                  value={laborRate}
                  onChange={(e) => setLaborRate(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </div>
          </div>

          {/* Resumo */}
          <div className="bg-blue-100 rounded-2xl p-4 border border-blue-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-blue-900">Valor original:</span>
              <span className="font-semibold text-blue-900">R$ {originalPrice.toFixed(2)}</span>
            </div>
            {materialTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-blue-800">+ Materiais:</span>
                <span className="font-bold text-blue-800">R$ {materialTotal.toFixed(2)}</span>
              </div>
            )}
            {laborTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-blue-800">+ Mão de obra:</span>
                <span className="font-bold text-blue-800">R$ {laborTotal.toFixed(2)}</span>
              </div>
            )}
            {totalExtras > 0 && (
              <div className="flex justify-between text-base font-bold border-t-2 border-blue-300 pt-3">
                <span className="text-blue-900">Novo total:</span>
                <span className="text-blue-900">R$ {newTotal.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="space-y-2 pt-2 border-t border-blue-200">
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setShowConfirmApprove(true)}
                disabled={totalExtras <= 0 || loading}
                className="rounded-2xl bg-green-600 hover:bg-green-700 text-white h-10 font-semibold"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Enviar
              </Button>
              <Button
                onClick={() => setShowRejectionForm(true)}
                variant="outline"
                className="rounded-2xl border-red-300 text-red-600 hover:bg-red-50 h-10 font-semibold"
                disabled={loading}
              >
                <XCircle className="w-4 h-4 mr-2" /> Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação */}
      {showConfirmApprove && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-3 border-t border-blue-200">
          <p className="text-sm font-semibold text-green-900">✓ Confirmar envio do orçamento extra?</p>
          <p className="text-sm text-green-800">
            Você está solicitando um adicional de <strong>R$ {totalExtras.toFixed(2)}</strong>, totalizando <strong>R$ {newTotal.toFixed(2)}</strong>.
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

      {/* Formulário de cancelamento */}
      {showRejectionForm && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-red-900">❌ Cancelar pedido de orçamento extra?</p>
          <textarea
            placeholder="Motivo do cancelamento..."
            value={cancellationNotes}
            onChange={(e) => setCancellationNotes(e.target.value)}
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
                setCancellationNotes('');
              }}
              disabled={loading}
            >
              Voltar
            </Button>
            <Button
              size="sm"
              className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold"
              onClick={handleCancel}
              disabled={loading || !cancellationNotes.trim()}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}