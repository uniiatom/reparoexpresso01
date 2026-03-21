import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

function RepasseRow({ service, pricing, onSave }) {
  const [editing, setEditing] = useState(false);
  const [repasse, setRepasse] = useState(pricing?.repasse_value ?? '');
  const [repassePercent, setRepassePercent] = useState(pricing?.repasse_percent ?? '');
  const [repasseNote, setRepasseNote] = useState(pricing?.repasse_note ?? '');

  const handleSave = () => {
    onSave({
      service_type: service.type,
      repasse_value: repasse !== '' ? Number(repasse) : null,
      repasse_percent: repassePercent !== '' ? Number(repassePercent) : null,
      repasse_note: repasseNote,
    });
    setEditing(false);
  };

  const handleCancel = () => {
    setRepasse(pricing?.repasse_value ?? '');
    setRepassePercent(pricing?.repasse_percent ?? '');
    setRepasseNote(pricing?.repasse_note ?? '');
    setEditing(false);
  };

  const hasConfig = pricing?.repasse_value != null || pricing?.repasse_percent != null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="font-semibold text-foreground text-sm min-w-[160px]">{service.label}</p>

          {editing ? (
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">R$</span>
                <Input
                  value={repasse}
                  onChange={e => setRepasse(e.target.value)}
                  placeholder="Valor fixo"
                  className="w-24 h-8 text-sm"
                  type="number"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">ou</span>
                <Input
                  value={repassePercent}
                  onChange={e => setRepassePercent(e.target.value)}
                  placeholder="% do valor"
                  className="w-20 h-8 text-sm"
                  type="number"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <Input
                value={repasseNote}
                onChange={e => setRepasseNote(e.target.value)}
                placeholder="Observação"
                className="flex-1 h-8 text-sm min-w-[120px]"
              />
              <div className="flex gap-1">
                <Button size="icon" className="h-8 w-8 rounded-xl bg-green-600 text-white" onClick={handleSave}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="outline" className="h-8 w-8 rounded-xl" onClick={handleCancel}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-1 justify-end">
              {hasConfig ? (
                <div className="flex items-center gap-2 text-right">
                  {pricing.repasse_value != null && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-0 font-bold">
                      R$ {pricing.repasse_value}
                    </Badge>
                  )}
                  {pricing.repasse_percent != null && (
                    <Badge className="bg-blue-100 text-blue-800 border-0 font-bold">
                      {pricing.repasse_percent}%
                    </Badge>
                  )}
                  {pricing.repasse_note && (
                    <span className="text-xs text-muted-foreground">{pricing.repasse_note}</span>
                  )}
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

export default function ProviderRepasse() {
  const queryClient = useQueryClient();

  const { data: pricingList = [] } = useQuery({
    queryKey: ['service-pricing'],
    queryFn: () => base44.entities.ServicePricing.list(),
  });

  const saveRepasse = useMutation({
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
      toast.success("Repasse salvo!");
    },
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">
        Configure o valor de repasse ao prestador por tipo de serviço. Pode ser um <strong>valor fixo em R$</strong> ou uma <strong>porcentagem</strong> do valor cobrado ao cliente.
      </p>
      {ALL_SERVICES.map(service => (
        <RepasseRow
          key={service.type}
          service={service}
          pricing={pricingList.find(p => p.service_type === service.type)}
          onSave={(data) => saveRepasse.mutate(data)}
        />
      ))}
    </div>
  );
}