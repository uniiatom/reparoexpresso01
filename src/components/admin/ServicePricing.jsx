import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

const ALL_SERVICES = [
  { type: "eletrica", label: "Elétrica" },
  { type: "hidraulica", label: "Hidráulica" },
  { type: "pintura", label: "Pintura" },
  { type: "reparo_geral", label: "Reparo Geral" },
  { type: "montagem", label: "Montagem" },
  { type: "alvenaria", label: "Alvenaria" },
  { type: "fechadura", label: "Fechadura / Chaveiro" },
  { type: "ar_condicionado", label: "Ar Condicionado" },
  { type: "limpeza_caixa_dagua", label: "Limpeza Caixa d'Água" },
  { type: "limpeza_calha", label: "Limpeza de Calha" },
  { type: "substituicao_telha", label: "Substituição de Telha" },
  { type: "limpeza_telhado", label: "Limpeza de Telhado" },
  { type: "instalacao_coifa_parede", label: "Coifa de Parede" },
  { type: "instalacao_coifa_ilha", label: "Coifa Ilha" },
  { type: "conversao_vaso_coplado", label: "Conversão Vaso Coplado" },
  { type: "instalacao_vaso_monobloco", label: "Vaso Monobloco" },
  { type: "reparo_forro_gesso", label: "Reparo Forro de Gesso" },
  { type: "troca_pneu", label: "Troca de Pneu" },
  { type: "recarga_bateria", label: "Recarga de Bateria" },
  { type: "conserto_pneu", label: "Conserto de Pneu" },
  { type: "reboque", label: "Reboque" },
  { type: "veiculo_outros", label: "Chaveiro (Veículo)" },
  { type: "outros", label: "Outros" },
];

function PricingRow({ service, pricing, onSave }) {
  const [editing, setEditing] = useState(false);
  const [min, setMin] = useState(pricing?.price_min ?? '');
  const [max, setMax] = useState(pricing?.price_max ?? '');
  const [note, setNote] = useState(pricing?.note ?? '');

  const handleSave = () => {
    onSave({ service_type: service.type, price_min: Number(min), price_max: Number(max), note });
    setEditing(false);
  };

  const handleCancel = () => {
    setMin(pricing?.price_min ?? '');
    setMax(pricing?.price_max ?? '');
    setNote(pricing?.note ?? '');
    setEditing(false);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="font-semibold text-foreground text-sm min-w-[160px]">{service.label}</p>

          {editing ? (
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">R$</span>
                <Input value={min} onChange={e => setMin(e.target.value)} placeholder="Mín" className="w-20 h-8 text-sm" type="number" />
                <span className="text-xs text-muted-foreground">–</span>
                <Input value={max} onChange={e => setMax(e.target.value)} placeholder="Máx" className="w-20 h-8 text-sm" type="number" />
              </div>
              <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Observação (ex: por ponto)" className="flex-1 h-8 text-sm min-w-[140px]" />
              <div className="flex gap-1">
                <Button size="icon" className="h-8 w-8 rounded-xl bg-green-600 text-white" onClick={handleSave}><Check className="w-4 h-4" /></Button>
                <Button size="icon" variant="outline" className="h-8 w-8 rounded-xl" onClick={handleCancel}><X className="w-4 h-4" /></Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-1 justify-end">
              {pricing?.price_min != null ? (
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">
                    R$ {pricing.price_min} – R$ {pricing.price_max}
                  </p>
                  {pricing.note && <p className="text-xs text-muted-foreground">{pricing.note}</p>}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Não configurado</p>
              )}
              <Button size="icon" variant="outline" className="h-8 w-8 rounded-xl" onClick={() => setEditing(true)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ServicePricing() {
  const queryClient = useQueryClient();

  const { data: pricingList = [] } = useQuery({
    queryKey: ['service-pricing'],
    queryFn: () => base44.entities.ServicePricing.list(),
  });

  const savePricing = useMutation({
    mutationFn: async (data) => {
      const existing = pricingList.find(p => p.service_type === data.service_type);
      if (existing) {
        return base44.entities.ServicePricing.update(existing.id, data);
      } else {
        return base44.entities.ServicePricing.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-pricing'] });
      toast.success("Preço salvo!");
    },
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">Configure a faixa de preço sugerida para cada tipo de serviço. Essas referências ajudam clientes e prestadores a alinharem expectativas.</p>
      {ALL_SERVICES.map(service => (
        <PricingRow
          key={service.type}
          service={service}
          pricing={pricingList.find(p => p.service_type === service.type)}
          onSave={(data) => savePricing.mutate(data)}
        />
      ))}
    </div>
  );
}