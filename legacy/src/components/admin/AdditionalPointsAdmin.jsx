import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, MapPin, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Condicionado", outros: "Outros",
};

export default function AdditionalPointsAdmin() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState({});
  const [chargeValues, setChargeValues] = useState({});

  const { data: requests = [] } = useQuery({
    queryKey: ['requests-with-additional'],
    queryFn: () => base44.entities.ServiceRequest.list('-created_date'),
    refetchInterval: 15000,
  });

  // Filtra apenas chamados com pontos adicionais
  const requestsWithPoints = requests.filter(
    r => r.additional_points && r.additional_points.length > 0
  );

  const updateRequest = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ServiceRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests-with-additional'] });
      toast.success("Cobrança registrada com sucesso!");
    },
  });

  const handleCharge = (req, pointIndex) => {
    const key = `${req.id}-${pointIndex}`;
    const value = parseFloat(chargeValues[key]);
    if (!value || value <= 0) {
      toast.error("Informe um valor válido para cobrar.");
      return;
    }

    const updatedPoints = req.additional_points.map((pt, i) =>
      i === pointIndex ? { ...pt, charged: true, charged_value: value } : pt
    );

    updateRequest.mutate({ id: req.id, data: { additional_points: updatedPoints } });
    setChargeValues(prev => ({ ...prev, [key]: '' }));
  };

  const totalPending = requestsWithPoints.reduce((acc, r) => {
    return acc + (r.additional_points || []).filter(p => !p.charged).length;
  }, 0);

  if (requestsWithPoints.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p>Nenhum ponto adicional registrado ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {totalPending > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <p className="font-semibold text-orange-800 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {totalPending} ponto(s) adicional(is) aguardando cobrança
          </p>
        </div>
      )}

      {requestsWithPoints.map(req => {
        const isExpanded = expanded[req.id];
        const pendingCount = req.additional_points.filter(p => !p.charged).length;

        return (
          <Card key={req.id} className={cn(pendingCount > 0 && "border-orange-300")}>
            <CardContent className="p-4">
              {/* Header do chamado */}
              <button
                className="w-full flex items-start justify-between gap-3 text-left"
                onClick={() => setExpanded(prev => ({ ...prev, [req.id]: !prev[req.id] }))}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">
                      {SERVICE_LABELS[req.service_type] || req.service_type}
                    </span>
                    {req.service_number && (
                      <span className="text-xs font-mono text-primary/70 bg-primary/10 px-2 py-0.5 rounded">
                        {req.service_number}
                      </span>
                    )}
                    {pendingCount > 0 ? (
                      <Badge className="bg-orange-100 text-orange-800 border-0 text-xs">
                        {pendingCount} pendente(s)
                      </Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800 border-0 text-xs">
                        Todos cobrados
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    👤 {req.client_name} · 🔧 {req.provider_name || '—'}
                    {req.city ? ` · 📍 ${req.city}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {req.additional_points.length} ponto(s) adicional(is) registrado(s)
                  </p>
                </div>
                {isExpanded
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />}
              </button>

              {/* Lista de pontos adicionais */}
              {isExpanded && (
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  {req.additional_points.map((point, idx) => {
                    const key = `${req.id}-${idx}`;
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "rounded-2xl border p-4 space-y-3",
                          point.charged
                            ? "bg-green-50 border-green-200"
                            : "bg-orange-50 border-orange-200"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm text-foreground">{point.title}</p>
                              {point.charged ? (
                                <Badge className="bg-green-100 text-green-800 border-0 text-xs flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Cobrado
                                </Badge>
                              ) : (
                                <Badge className="bg-orange-100 text-orange-800 border-0 text-xs flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Pendente
                                </Badge>
                              )}
                            </div>
                            {point.description && (
                              <p className="text-xs text-muted-foreground mt-1">{point.description}</p>
                            )}
                            {point.extra_cost > 0 && (
                              <p className="text-xs text-orange-700 font-semibold mt-1">
                                Custo estimado pelo prestador: R$ {Number(point.extra_cost).toFixed(2)}
                              </p>
                            )}
                            {point.charged && point.charged_value && (
                              <p className="text-xs text-green-700 font-bold mt-1">
                                ✅ Valor cobrado: R$ {Number(point.charged_value).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Fotos */}
                        {point.photos?.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {point.photos.map((url, pi) => (
                              <a key={pi} href={url} target="_blank" rel="noreferrer">
                                <img
                                  src={url}
                                  alt={`Foto ${pi + 1}`}
                                  className="w-16 h-16 object-cover rounded-xl border border-border"
                                />
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Localização */}
                        {point.location?.latitude && (
                          <a
                            href={`https://maps.google.com/?q=${point.location.latitude},${point.location.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary flex items-center gap-1 hover:underline"
                          >
                            <MapPin className="w-3 h-3" /> Ver localização no mapa
                          </a>
                        )}

                        {/* Ação de cobrança */}
                        {!point.charged && (
                          <div className="flex gap-2 items-center pt-1">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder={point.extra_cost > 0 ? point.extra_cost.toFixed(2) : "0,00"}
                                value={chargeValues[key] || ''}
                                onChange={e => setChargeValues(prev => ({ ...prev, [key]: e.target.value }))}
                                className="pl-9 rounded-xl"
                              />
                            </div>
                            <Button
                              size="sm"
                              className="rounded-xl bg-primary text-primary-foreground font-bold whitespace-nowrap"
                              onClick={() => handleCharge(req, idx)}
                              disabled={updateRequest.isPending}
                            >
                              <DollarSign className="w-4 h-4 mr-1" /> Registrar cobrança
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}