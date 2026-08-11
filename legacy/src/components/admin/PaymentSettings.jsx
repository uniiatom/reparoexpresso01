import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const SERVICE_TYPES = [
  { value: "eletrica", label: "Elétrica" },
  { value: "hidraulica", label: "Hidráulica" },
  { value: "pintura", label: "Pintura" },
  { value: "montagem", label: "Montagem" },
  { value: "reparo_geral", label: "Reparo Geral" },
  { value: "alvenaria", label: "Alvenaria" },
  { value: "fechadura", label: "Fechadura" },
  { value: "ar_condicionado", label: "Ar Condicionado" },
  { value: "troca_pneu", label: "Troca de Pneu" },
  { value: "reboque", label: "Reboque" },
];

export default function PaymentSettings() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    service_type: '',
    repasse_percent: 70,
    repasse_value: null,
  });

  const { data: pricings = [], isLoading } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: () => base44.entities.ServicePricing.list('-created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ServicePricing.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-settings'] });
      setFormData({ service_type: '', repasse_percent: 70, repasse_value: null });
      toast.success('Configuração criada');
    },
    onError: () => toast.error('Erro ao criar'),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.ServicePricing.update(editingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-settings'] });
      setEditingId(null);
      setFormData({ service_type: '', repasse_percent: 70, repasse_value: null });
      toast.success('Configuração atualizada');
    },
    onError: () => toast.error('Erro ao atualizar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ServicePricing.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-settings'] });
      toast.success('Configuração removida');
    },
    onError: () => toast.error('Erro ao remover'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      service_type: formData.service_type,
      repasse_percent: parseInt(formData.repasse_percent),
      repasse_value: formData.repasse_value ? parseFloat(formData.repasse_value) : null,
    };

    if (editingId) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (pricing) => {
    setEditingId(pricing.id);
    setFormData({
      service_type: pricing.service_type,
      repasse_percent: pricing.repasse_percent || 70,
      repasse_value: pricing.repasse_value || null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {editingId ? 'Editar Configuração de Repasse' : 'Nova Configuração de Repasse'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Serviço</Label>
              <select
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                disabled={!!editingId}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
              >
                <option value="">Selecione um serviço</option>
                {SERVICE_TYPES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Percentual de Repasse ao Prestador (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.repasse_percent}
                onChange={(e) => setFormData({ ...formData, repasse_percent: e.target.value })}
                className="rounded-lg"
              />
              <p className="text-xs text-muted-foreground">
                {100 - parseInt(formData.repasse_percent || 0)}% fica com a plataforma
              </p>
            </div>

            <div className="space-y-2">
              <Label>Valor Fixo de Repasse (opcional)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Se preenchido, sobrescreve o percentual"
                value={formData.repasse_value || ''}
                onChange={(e) => setFormData({ ...formData, repasse_value: e.target.value })}
                className="rounded-lg"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={!formData.service_type || createMutation.isPending || updateMutation.isPending}
                className="flex-1 rounded-lg bg-primary text-primary-foreground"
              >
                <Save className="w-4 h-4 mr-2" />
                {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({ service_type: '', repasse_percent: 70, repasse_value: null });
                  }}
                  className="rounded-lg"
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Configurações Existentes */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">Configurações Ativas</h3>
        {pricings.map(pricing => {
          const serviceLabel = SERVICE_TYPES.find(s => s.value === pricing.service_type)?.label || pricing.service_type;
          return (
            <Card key={pricing.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{serviceLabel}</p>
                    <p className="text-sm text-muted-foreground">
                      {pricing.repasse_value 
                        ? `Repasse fixo: R$ ${pricing.repasse_value.toFixed(2)}`
                        : `Repasse: ${pricing.repasse_percent || 70}% ao prestador`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(pricing)}
                      className="rounded-lg"
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(pricing.id)}
                      disabled={deleteMutation.isPending}
                      className="rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}