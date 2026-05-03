import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

export default function TowPricing() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [serviceExit, setServiceExit] = useState('');
  const [pricePerKm, setPricePerKm] = useState('');
  const [firstKms, setFirstKms] = useState('');

  // Busca configuração de reboque (usa a configuração para reboque com city=null)
  const { data: towConfig } = useQuery({
    queryKey: ['tow-config'],
    queryFn: async () => {
      const list = await base44.entities.ServicePricing.filter({ service_type: 'reboque' });
      return list.find(p => !p.city) || null;
    },
  });

  // Carrega valores ao abrir edição
  useEffect(() => {
    if (editing && towConfig) {
      setServiceExit(towConfig.price_min || '');
      setPricePerKm(towConfig.price_max || '');
      setFirstKms(towConfig.note ? parseInt(towConfig.note) : '');
    }
  }, [editing, towConfig]);

  const saveTowConfig = useMutation({
    mutationFn: async () => {
      const data = {
        service_type: 'reboque',
        price_min: Number(serviceExit) || 0,
        price_max: Number(pricePerKm) || 0,
        note: firstKms ? `${firstKms}` : '0',
      };

      if (towConfig) {
        return base44.entities.ServicePricing.update(towConfig.id, data);
      } else {
        return base44.entities.ServicePricing.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tow-config'] });
      toast.success('Configuração de reboque atualizada!');
      setEditing(false);
    },
  });

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <h3 className="font-bold text-foreground mb-2">🚗 Configuração de Reboque</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Configure os valores de saída e custo por quilômetro. O sistema calculará automaticamente o preço final baseado na distância.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          {editing ? (
            <>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-1">Taxa de Saída (R$)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 50.00"
                    value={serviceExit}
                    onChange={(e) => setServiceExit(e.target.value)}
                    className="rounded-lg"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Valor fixo cobrado para cada reboque</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground block mb-1">Preço por km (R$)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 5.50"
                    value={pricePerKm}
                    onChange={(e) => setPricePerKm(e.target.value)}
                    className="rounded-lg"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Valor cobrado por cada quilômetro</p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground block mb-1">Primeiros km inclusos</label>
                  <Input
                    type="number"
                    placeholder="Ex: 5"
                    value={firstKms}
                    onChange={(e) => setFirstKms(e.target.value)}
                    className="rounded-lg"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Quilômetros inclusos na taxa de saída (sem custo adicional)</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                <p className="font-semibold mb-1">📌 Exemplo de cálculo:</p>
                <p>
                  Taxa de saída: R$ {serviceExit || '0'} + {firstKms || '0'} km grátis
                </p>
                <p>
                  Se cliente vai 15 km: R$ {serviceExit || '0'} + ({15 - (firstKms ? parseInt(firstKms) : 0)} km × R$ {pricePerKm || '0'})
                </p>
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
                  onClick={() => {
                    setEditing(false);
                    setServiceExit('');
                    setPricePerKm('');
                    setFirstKms('');
                  }}
                  variant="outline"
                  className="flex-1 rounded-lg"
                >
                  <X className="w-4 h-4 mr-2" /> Cancelar
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Taxa de Saída</p>
                  <p className="text-2xl font-bold text-primary">
                    R$ {towConfig?.price_min?.toFixed(2) || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Preço/km</p>
                  <p className="text-2xl font-bold text-primary">
                    R$ {towConfig?.price_max?.toFixed(2) || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Primeiros km</p>
                  <p className="text-2xl font-bold text-primary">
                    {towConfig?.note ? `${towConfig.note} km` : '—'}
                  </p>
                </div>
              </div>

              {towConfig && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                  <p className="font-semibold mb-1">✓ Configuração ativa</p>
                  <p>
                    Saída: R$ {towConfig.price_min?.toFixed(2)} + {towConfig.note || '0'} km grátis + R$ {towConfig.price_max?.toFixed(2)}/km
                  </p>
                </div>
              )}

              <Button
                onClick={() => setEditing(true)}
                className="w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Pencil className="w-4 h-4 mr-2" /> Editar Configuração
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}