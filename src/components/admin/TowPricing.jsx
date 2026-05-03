import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

const VEHICLE_TYPES = [
  { key: 'moto', label: '🏍️ Moto', desc: 'Motocicleta/scooter' },
  { key: 'carro', label: '🚗 Carro', desc: 'Sedan/hatch' },
  { key: 'suv', label: '🚙 SUV', desc: 'SUV/crossover' },
  { key: 'van', label: '🚐 Van', desc: 'Van/minibus' },
];

export default function TowPricing() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  // Busca todas as configurações de reboque por categoria
  const { data: towConfigs = [] } = useQuery({
    queryKey: ['tow-pricing-categories'],
    queryFn: async () => {
      const list = await base44.entities.ServicePricing.filter({ service_type: 'reboque' });
      return list.filter(p => !p.city);
    },
  });

  // Carrega valores ao abrir edição
  useEffect(() => {
    if (editing) {
      const data = {};
      VEHICLE_TYPES.forEach(vehicle => {
        const config = towConfigs.find(c => c.note?.includes(`${vehicle.key}|`));
        data[vehicle.key] = {
          id: config?.id,
          exit: config?.price_min || '',
          perKm: config?.price_max || '',
        };
      });
      setFormData(data);
    }
  }, [editing, towConfigs]);

  const saveTowConfig = useMutation({
    mutationFn: async () => {
      const updates = [];
      for (const vehicle of VEHICLE_TYPES) {
        const values = formData[vehicle.key];
        if (!values || (!values.exit && !values.perKm)) continue;
        
        const data = {
          service_type: 'reboque',
          price_min: Number(values.exit) || 0,
          price_max: Number(values.perKm) || 0,
          note: `${vehicle.key}|${vehicle.label}`,
        };

        if (values.id) {
          updates.push(base44.entities.ServicePricing.update(values.id, data));
        } else {
          updates.push(base44.entities.ServicePricing.create(data));
        }
      }
      if (updates.length === 0) throw new Error('Nenhum valor preenchido');
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tow-pricing-categories'] });
      toast.success('Preços de reboque atualizados!');
      setEditing(false);
    },
    onError: (error) => {
      toast.error('Erro ao salvar: ' + (error.message || 'Tente novamente'));
    },
  });

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <h3 className="font-bold text-foreground mb-2">🚗 Preços de Reboque por Categoria</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Configure taxa de saída e preço por km para cada tipo de veículo (moto, carro, SUV, van).
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          {editing ? (
            <>
              <div className="space-y-4">
                {VEHICLE_TYPES.map(vehicle => {
                  const data = formData[vehicle.key] || {};
                  return (
                    <div key={vehicle.key} className="border border-border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">{vehicle.label.split(' ')[0]}</span>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{vehicle.label}</p>
                          <p className="text-xs text-muted-foreground">{vehicle.desc}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-foreground block mb-1">Taxa Saída (R$)</label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Ex: 150"
                            value={data.exit || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              [vehicle.key]: { ...data, exit: e.target.value }
                            })}
                            className="rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-foreground block mb-1">Preço/km (R$)</label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Ex: 3.50"
                            value={data.perKm || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              [vehicle.key]: { ...data, perKm: e.target.value }
                            })}
                            className="rounded-lg text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => saveTowConfig.mutate()}
                  disabled={saveTowConfig.isPending}
                  className="flex-1 rounded-lg bg-green-600 text-white hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-2" /> Salvar
                </Button>
                <Button
                  onClick={() => setEditing(false)}
                  variant="outline"
                  className="flex-1 rounded-lg"
                >
                  <X className="w-4 h-4 mr-2" /> Cancelar
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                {VEHICLE_TYPES.map(vehicle => {
                  const config = towConfigs.find(c => c.note?.includes(`${vehicle.key}|`));
                  return (
                    <div key={vehicle.key} className="border border-border rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{vehicle.label.split(' ')[0]}</span>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{vehicle.label}</p>
                          {config ? (
                            <p className="text-xs text-green-600">
                              R$ {config.price_min?.toFixed(2)} + R$ {config.price_max?.toFixed(2)}/km
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">Não configurado</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                onClick={() => setEditing(true)}
                className="w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Pencil className="w-4 h-4 mr-2" /> Editar Preços
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}