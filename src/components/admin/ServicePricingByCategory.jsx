import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Save, X, Plus, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";

const SERVICE_TYPES = [
  'eletrica', 'hidraulica', 'reparo_geral', 'fechadura', 'ar_condicionado',
  'limpeza_caixa_dagua', 'limpeza_calha', 'substituicao_telha', 'limpeza_telhado',
  'instalacao_coifa_parede', 'conversao_vaso_coplado', 'reparo_forro_gesso',
  'desentupimento', 'instalacao_suporte_tv', 'outros', 'troca_pneu', 'recarga_bateria',
  'conserto_pneu', 'reboque'
];

export default function ServicePricingByCategory() {
  const [editingId, setEditingId] = useState(null);
  const [newPricing, setNewPricing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const queryClient = useQueryClient();

  const { data: pricings = [], isLoading } = useQuery({
    queryKey: ['service-pricing'],
    queryFn: () => base44.entities.ServicePricing.list('-created_date', 100),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.ServicePricing.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-pricing'] });
      setEditingId(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ServicePricing.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-pricing'] });
      setNewPricing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ServicePricing.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-pricing'] });
    },
  });

  const handleEdit = (pricing) => {
    setEditingId(pricing.id);
    setEditForm(pricing);
  };

  const handleSave = () => {
    const { id, ...data } = editForm;
    data.price_min = Number(data.price_min) || null;
    data.price_max = Number(data.price_max) || null;
    updateMutation.mutate({ id, ...data });
  };

  const handleCreateNew = () => {
    const data = {
      ...newPricing,
      price_min: Number(newPricing.price_min) || null,
      price_max: Number(newPricing.price_max) || null,
    };
    createMutation.mutate(data);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-foreground mb-1">Precificação por Categoria</h3>
        <p className="text-sm text-muted-foreground">Gerencie preços mínimo e máximo para cada tipo de serviço</p>
      </div>

      {/* Novo */}
      {newPricing === null ? (
        <Button
          onClick={() => setNewPricing({ service_type: '', price_min: '', price_max: '', note: '' })}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" /> Adicionar Nova Categoria
        </Button>
      ) : (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">Nova Categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Tipo de Serviço *</Label>
              <select
                value={newPricing.service_type}
                onChange={(e) => setNewPricing({ ...newPricing, service_type: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-input text-sm"
              >
                <option value="">Selecione...</option>
                {SERVICE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Preço Mín.</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newPricing.price_min}
                  onChange={(e) => setNewPricing({ ...newPricing, price_min: e.target.value })}
                  className="text-sm h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Preço Máx.</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newPricing.price_max}
                  onChange={(e) => setNewPricing({ ...newPricing, price_max: e.target.value })}
                  className="text-sm h-8"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Observação</Label>
              <Input
                placeholder="Ex: por ponto, por metro"
                value={newPricing.note}
                onChange={(e) => setNewPricing({ ...newPricing, note: e.target.value })}
                className="text-sm h-8"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreateNew}
                disabled={!newPricing.service_type || createMutation.isPending}
                size="sm"
                className="flex-1"
              >
                {createMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                Salvar
              </Button>
              <Button
                onClick={() => setNewPricing(null)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <X className="w-3 h-3 mr-1" /> Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista */}
      <div className="grid gap-3">
        {pricings.map((pricing) => (
          <Card key={pricing.id} className={cn(editingId === pricing.id && "border-primary bg-primary/5")}>
            <CardContent className="pt-6">
              {editingId === pricing.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Preço Mín.</Label>
                      <Input
                        type="number"
                        value={editForm.price_min || ''}
                        onChange={(e) => setEditForm({ ...editForm, price_min: e.target.value })}
                        className="text-sm h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Preço Máx.</Label>
                      <Input
                        type="number"
                        value={editForm.price_max || ''}
                        onChange={(e) => setEditForm({ ...editForm, price_max: e.target.value })}
                        className="text-sm h-8"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Observação</Label>
                    <Input
                      value={editForm.note || ''}
                      onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                      placeholder="Ex: por ponto, por metro"
                      className="text-sm h-8"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                      size="sm"
                      className="flex-1"
                    >
                      {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                      Salvar
                    </Button>
                    <Button
                      onClick={() => setEditingId(null)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <X className="w-3 h-3 mr-1" /> Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-foreground">{pricing.service_type}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>💰 R$ {pricing.price_min?.toFixed(2) || '—'} – R$ {pricing.price_max?.toFixed(2) || '—'}</span>
                      {pricing.note && <span className="text-blue-600">({pricing.note})</span>}
                    </div>
                    {pricing.city && <p className="text-xs text-muted-foreground mt-1">📍 {pricing.city}, {pricing.state}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => handleEdit(pricing)}
                      variant="ghost"
                      size="sm"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => deleteMutation.mutate(pricing.id)}
                      variant="ghost"
                      size="sm"
                      disabled={deleteMutation.isPending}
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {pricings.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhuma precificação cadastrada ainda</p>
        </div>
      )}
    </div>
  );
}