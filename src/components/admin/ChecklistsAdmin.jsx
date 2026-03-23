import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ClipboardList, MapPin, ChevronDown, ChevronUp, Image } from "lucide-react";
import { cn } from "@/lib/utils";

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Condicionado", outros: "Outros",
};

export default function ChecklistsAdmin() {
  const [expanded, setExpanded] = useState(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-checklists'],
    queryFn: () => base44.entities.ServiceRequest.list('-updated_date', 200),
    refetchInterval: 15000,
  });

  const withChecklist = requests.filter(r => r.checklist?.completed_at);

  if (isLoading) {
    return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  if (withChecklist.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p>Nenhum checklist preenchido ainda</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">{withChecklist.length} checklist(s) preenchido(s)</p>
      {withChecklist.map(req => {
        const cl = req.checklist;
        const isOpen = expanded === req.id;
        const completedDate = cl.completed_at ? new Date(cl.completed_at).toLocaleString('pt-BR') : '-';
        const totalItems = cl.items?.length || 0;
        const checkedItems = cl.items?.filter(i => i.checked).length || 0;

        return (
          <Card key={req.id} className="overflow-hidden">
            <CardContent className="p-4">
              {/* Header resumo */}
              <button
                className="w-full text-left"
                onClick={() => setExpanded(isOpen ? null : req.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{SERVICE_LABELS[req.service_type] || req.service_type}</span>
                      {req.service_number && (
                        <span className="text-xs font-mono text-primary/70 bg-primary/10 px-2 py-0.5 rounded">{req.service_number}</span>
                      )}
                      <Badge className="bg-green-100 text-green-800 border-0 text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> {checkedItems}/{totalItems} itens
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      👤 {req.client_name} · 🔧 {req.provider_name || '-'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <MapPin className="w-3 h-3 inline mr-1" />{req.address}{req.city ? `, ${req.city}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">📅 {completedDate}</p>
                  </div>
                  <div className="flex-shrink-0 mt-1">
                    {isOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                  </div>
                </div>
              </button>

              {/* Detalhes expandidos */}
              {isOpen && (
                <div className="mt-4 border-t border-border pt-4 space-y-4">

                  {/* Descrição do serviço */}
                  {cl.service_description && (
                    <div>
                      <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">Descrição do serviço</p>
                      <p className="text-sm text-muted-foreground bg-muted rounded-xl p-3">{cl.service_description}</p>
                    </div>
                  )}

                  {/* Itens do checklist */}
                  {cl.items?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Itens obrigatórios</p>
                      <div className="space-y-1">
                        {cl.items.map((item, idx) => (
                          <div key={idx} className={cn("flex items-center gap-2 px-3 py-2 rounded-xl text-sm",
                            item.checked ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700")}>
                            <CheckCircle2 className={cn("w-4 h-4 flex-shrink-0", item.checked ? "text-green-500" : "text-red-400")} />
                            {item.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Autorizações */}
                  {cl.authorizations?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Confirmações de autorização</p>
                      <div className="space-y-1">
                        {cl.authorizations.map((item, idx) => (
                          <div key={idx} className={cn("flex items-center gap-2 px-3 py-2 rounded-xl text-sm",
                            item.checked ? "bg-blue-50 text-blue-800" : "bg-red-50 text-red-700")}>
                            <CheckCircle2 className={cn("w-4 h-4 flex-shrink-0", item.checked ? "text-blue-500" : "text-red-400")} />
                            {item.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Localização */}
                  {cl.location && (
                    <div>
                      <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">Geolocalização</p>
                      <p className="text-sm text-muted-foreground bg-muted rounded-xl p-3">
                        📍 {cl.location.latitude?.toFixed(5)}, {cl.location.longitude?.toFixed(5)}
                        {cl.location.accuracy && ` · precisão ~${Math.round(cl.location.accuracy)}m`}
                      </p>
                    </div>
                  )}

                  {/* Assinaturas */}
                  <div className="grid grid-cols-2 gap-3">
                    {cl.pre_auth_signature && (
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-1">Assinatura prévia</p>
                        <img src={cl.pre_auth_signature} alt="Assinatura prévia" className="w-full border border-border rounded-xl bg-white" />
                      </div>
                    )}
                    {cl.final_signature && (
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-1">Assinatura final</p>
                        <img src={cl.final_signature} alt="Assinatura final" className="w-full border border-border rounded-xl bg-white" />
                      </div>
                    )}
                  </div>

                  {/* Fotos */}
                  {cl.photos?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                        <Image className="w-3.5 h-3.5" /> Fotos ({cl.photos.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {cl.photos.map((url, idx) => (
                          <a key={idx} href={url} target="_blank" rel="noreferrer">
                            <img src={url} alt={`Foto ${idx + 1}`} className="w-20 h-20 object-cover rounded-xl border border-border" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Observações */}
                  {cl.notes && (
                    <div>
                      <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">Observações</p>
                      <p className="text-sm text-muted-foreground bg-muted rounded-xl p-3">{cl.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}