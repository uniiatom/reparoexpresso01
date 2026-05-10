import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ITEM_TYPES = [
  { id: 'material', label: '🔧 Material', unit: 'un' },
  { id: 'material_m', label: '📏 Material (metro)', unit: 'm' },
  { id: 'material_m2', label: '📐 Material (m²)', unit: 'm²' },
  { id: 'hours', label: '⏰ Horas extras', unit: 'h' },
];

export default function ExtraChargesModal({ job, onClose, onSuccess }) {
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const addItem = () => {
    setItems([...items, { id: Date.now(), type: 'material', description: '', quantity: 1, price: 0 }]);
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const totalExtra = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const newTotal = (job.final_price || job.estimated_price || 0) + totalExtra;

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }

    if (items.some(item => !item.description || item.quantity <= 0 || item.price <= 0)) {
      toast.error('Preencha todos os campos dos itens');
      return;
    }

    setLoading(true);
    try {
      // Cria registro de orçamento extra pendente
      await base44.entities.ServiceRequest.update(job.id, {
        extra_charges: {
          items: items.map(({ id, ...item }) => item),
          total: totalExtra,
          notes,
          requested_at: new Date().toISOString(),
          status: 'pending_approval',
          new_total: newTotal,
        }
      });

      // Notifica cliente via função backend
      try {
        await base44.functions.invoke('notifyExtraChargesApproval', {
          service_id: job.id,
          client_email: job.created_by,
          service_number: job.service_number,
          client_name: job.client_name,
          provider_name: job.provider_name,
          items,
          extra_total: totalExtra,
          new_total: newTotal,
          notes,
        });
      } catch (notifyError) {
        console.error('Erro ao notificar cliente:', notifyError);
        toast.warning('Orçamento salvo, mas notificação ao cliente falhou');
      }

      toast.success('Orçamento extra enviado para aprovação do cliente');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao enviar orçamento extra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-2">
      <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Orçamento Extra</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2 text-xs text-blue-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>Adicione materiais ou horas extras. O cliente receberá notificação para aprovar o novo valor.</p>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => {
            const typeLabel = ITEM_TYPES.find(t => t.id === item.type)?.label || '';
            return (
              <div key={item.id} className="bg-muted rounded-xl p-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <select
                    value={item.type}
                    onChange={(e) => updateItem(item.id, 'type', e.target.value)}
                    className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {ITEM_TYPES.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="ml-2 p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Descrição (ex: Reparo elétrico extra)"
                  value={item.description}
                  onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Quantidade</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">R$ unitário</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>

                <div className="text-right text-xs font-semibold text-foreground">
                  Subtotal: R$ {(item.quantity * item.price).toFixed(2)}
                </div>
              </div>
            );
          })}

          <Button
            onClick={addItem}
            variant="outline"
            className="w-full rounded-xl text-xs font-semibold"
          >
            <Plus className="w-4 h-4 mr-1" /> Adicionar item
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground">Observações (opcional)</label>
          <Textarea
            placeholder="Ex: Cliente solicitou reparo adicional na tubulação"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="text-xs rounded-xl"
          />
        </div>

        <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 space-y-1">
          <p className="text-xs text-muted-foreground">Orçamento original:</p>
          <p className="text-xs font-semibold text-foreground">R$ {(job.final_price || job.estimated_price || 0).toFixed(2)}</p>
          <div className="border-t border-primary/20 pt-2 mt-2">
            <p className="text-xs text-muted-foreground">+ Itens extras:</p>
            <p className="text-sm font-bold text-primary">R$ {totalExtra.toFixed(2)}</p>
          </div>
          <div className="border-t border-primary/20 pt-2 mt-2">
            <p className="text-xs text-muted-foreground">= Novo total:</p>
            <p className="text-lg font-bold text-foreground">R$ {newTotal.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={onClose} variant="outline" className="flex-1 rounded-xl">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || items.length === 0}
            className="flex-1 rounded-xl bg-primary text-primary-foreground font-bold"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Enviar para aprovação
          </Button>
        </div>
      </div>
    </div>
  );
}