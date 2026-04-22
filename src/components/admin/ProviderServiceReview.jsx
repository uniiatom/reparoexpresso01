import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, ClipboardList, MapPin, Image, DollarSign, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Condicionado",
  limpeza_caixa_dagua: "Limpeza Caixa d'Água", desentupimento: "Desentupimento",
  outros: "Outros",
};

// Agrupa atendimentos por prestador
function groupByProvider(requests) {
  const map = {};
  for (const r of requests) {
    if (!r.provider_id || !r.provider_name) continue;
    if (!map[r.provider_id]) {
      map[r.provider_id] = { provider_id: r.provider_id, provider_name: r.provider_name, requests: [] };
    }
    map[r.provider_id].requests.push(r);
  }
  return Object.values(map).sort((a, b) => a.provider_name.localeCompare(b.provider_name));
}

function ServiceRow({ req, expanded, onToggle }) {
  const cl = req.checklist;
  const hasChecklist = cl?.completed_at;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-3 p-3 hover:bg-muted/50 transition text-left"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{SERVICE_LABELS[req.service_type] || req.service_type}</span>
            {req.service_number && (
              <span className="text-xs font-mono text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">{req.service_number}</span>
            )}
            {hasChecklist
              ? <span className="text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded flex items-center gap-1"><ClipboardList className="w-3 h-3" />Checklist OK</span>
              : <span className="text-xs text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded">Sem checklist</span>
            }
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{req.client_name} · {req.address}</p>
          <p className="text-xs text-muted-foreground">📅 {req.created_date ? new Date(req.created_date).toLocaleDateString('pt-BR') : '—'}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {req.final_price && (
            <span className="font-bold text-primary text-sm">R$ {req.final_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border bg-muted/20 p-3 space-y-3">
          {/* Descrição */}
          <p className="text-xs text-muted-foreground">{req.description}</p>

          {/* Localização */}
          {req.city && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {req.address}{req.city ? `, ${req.city}` : ''}
            </p>
          )}

          {/* Valores */}
          {(req.estimated_price || req.final_price) && (
            <div className="flex gap-3 text-xs">
              {req.estimated_price && <span className="text-muted-foreground">Estimado: R$ {req.estimated_price}</span>}
              {req.final_price && <span className="font-bold text-primary">Final: R$ {req.final_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
            </div>
          )}

          {/* Fotos do problema */}
          {req.problem_photos?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1"><Image className="w-3 h-3" /> Fotos do problema</p>
              <div className="flex flex-wrap gap-2">
                {req.problem_photos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-border" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Checklist */}
          {hasChecklist && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-bold text-green-800 flex items-center gap-1"><FileCheck className="w-3.5 h-3.5" /> Checklist preenchido</p>

              {cl.items?.length > 0 && (
                <div className="space-y-1">
                  {cl.items.map((item, idx) => (
                    <div key={idx} className={cn("flex items-center gap-2 text-xs px-2 py-1 rounded-lg",
                      item.checked ? "text-green-800 bg-green-100" : "text-red-700 bg-red-50")}>
                      {item.checked
                        ? <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                        : <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                      {item.label}
                    </div>
                  ))}
                </div>
              )}

              {cl.photos?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-700 mb-1">Fotos do checklist:</p>
                  <div className="flex flex-wrap gap-2">
                    {cl.photos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-green-300" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {cl.notes && <p className="text-xs text-green-700 bg-green-100 rounded-lg p-2">📝 {cl.notes}</p>}

              <p className="text-xs text-green-600">
                Concluído em: {new Date(cl.completed_at).toLocaleString('pt-BR')}
              </p>
            </div>
          )}

          {/* Pontos adicionais */}
          {req.additional_points?.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-bold text-orange-800">➕ {req.additional_points.length} ponto(s) adicional(is)</p>
              {req.additional_points.map((pt, i) => (
                <div key={i} className="text-xs text-orange-700 border-t border-orange-200 pt-2">
                  <p className="font-semibold">{pt.title}</p>
                  {pt.description && <p>{pt.description}</p>}
                  {pt.extra_cost > 0 && <p className="font-bold">+ R$ {pt.extra_cost.toFixed(2)}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProviderGroup({ group, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  const [expandedReqs, setExpandedReqs] = useState({});

  const total = group.requests.reduce((s, r) => s + (r.final_price || 0), 0);
  const withChecklist = group.requests.filter(r => r.checklist?.completed_at).length;
  const allOk = withChecklist === group.requests.length;

  const toggleReq = (id) => setExpandedReqs(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-muted/30 transition text-left"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="font-bold text-primary text-lg">{group.provider_name.charAt(0)}</span>
          </div>
          <div>
            <p className="font-bold text-foreground">{group.provider_name}</p>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className="text-xs text-muted-foreground">{group.requests.length} atendimento(s)</span>
              {allOk
                ? <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Tudo OK</span>
                : <span className="text-xs text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full font-semibold">{withChecklist}/{group.requests.length} checklists</span>
              }
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="font-bold text-primary text-sm">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground">valor total</p>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-2">
          {group.requests.map(req => (
            <ServiceRow
              key={req.id}
              req={req}
              expanded={!!expandedReqs[req.id]}
              onToggle={() => toggleReq(req.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProviderServiceReview({ period }) {
  const [filterStatus, setFilterStatus] = useState('concluido');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests-for-review', filterStatus],
    queryFn: () => base44.entities.ServiceRequest.filter({ status: filterStatus }, '-created_date', 500),
  });

  // Filtra por período se fornecido (period_start / period_end do closing)
  const filtered = period
    ? requests.filter(r => {
        const d = r.created_date ? new Date(r.created_date) : null;
        if (!d) return false;
        const start = new Date(period.start + 'T00:00:00');
        const end = new Date(period.end + 'T23:59:59');
        return d >= start && d <= end;
      })
    : requests;

  const groups = groupByProvider(filtered);
  const totalGeral = filtered.reduce((s, r) => s + (r.final_price || 0), 0);
  const withChecklist = filtered.filter(r => r.checklist?.completed_at).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" /> Conferência de Atendimentos por Prestador
        </h3>
        <p className="text-xs text-muted-foreground">Analise todos os atendimentos agrupados por prestador antes de liberar a emissão de nota fiscal.</p>

        {/* Filtro status */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'concluido', label: '✅ Concluídos' },
            { value: 'em_andamento', label: '🔧 Em andamento' },
            { value: 'cancelado', label: '❌ Cancelados' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={cn("text-xs px-3 py-1.5 rounded-xl font-semibold border transition",
                filterStatus === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resumo geral */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <p className="text-xl font-black text-blue-800">{filtered.length}</p>
            <p className="text-xs text-blue-600">Atendimentos</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <p className="text-xl font-black text-green-800">{withChecklist}</p>
            <p className="text-xs text-green-600">Com checklist</p>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center">
            <p className="text-sm font-black text-primary">R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-primary/70">Valor total</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      )}

      {/* Prestadores */}
      {!isLoading && groups.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Nenhum atendimento encontrado com este status.</p>
        </div>
      )}

      {!isLoading && groups.map(group => (
        <ProviderGroup key={group.provider_id} group={group} />
      ))}
    </div>
  );
}