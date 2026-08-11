import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, ClipboardList, MapPin, Image, DollarSign, FileCheck, Phone, Hash, Wrench, Car, ThumbsUp, ThumbsDown, RotateCcw, AlertCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Condicionado",
  limpeza_caixa_dagua: "Limpeza Caixa d'Água", desentupimento: "Desentupimento",
  reboque: "Reboque", troca_pneu: "Troca de Pneu", recarga_bateria: "Recarga de Bateria",
  conserto_pneu: "Conserto de Pneu", veiculo_outros: "Veículo - Outros",
  limpeza_calha: "Limpeza de Calha", substituicao_telha: "Substituição de Telha",
  limpeza_telhado: "Limpeza de Telhado", caca_vazamento: "Caça-Vazamento",
  checkup: "Checkup", portao_eletronico: "Portão Eletrônico",
  outros: "Outros",
};

const STATUS_COLORS = {
  concluido: 'bg-green-100 text-green-800 border-green-300',
  cancelado: 'bg-red-100 text-red-800 border-red-300',
  aguardando: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  aceito: 'bg-blue-100 text-blue-800 border-blue-300',
  a_caminho: 'bg-sky-100 text-sky-800 border-sky-300',
  em_andamento: 'bg-purple-100 text-purple-800 border-purple-300',
  agendado: 'bg-indigo-100 text-indigo-800 border-indigo-300',
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

function ServiceRow({ req, expanded, onToggle, onStatusChange }) {
  const cl = req.checklist;
  const hasChecklist = cl?.completed_at;
  const [confirmAction, setConfirmAction] = useState(null); // 'recusar' | 'voltar' | null

  const handleAction = async (action) => {
    if (action === 'ok') {
      await onStatusChange(req.id, 'concluido');
      toast.success('OS marcada como concluída');
    } else if (action === 'recusar') {
      await onStatusChange(req.id, 'cancelado');
      toast.success('OS cancelada');
    } else if (action === 'voltar') {
      await onStatusChange(req.id, 'aguardando');
      toast.success('OS devolvida para o cliente');
    }
    setConfirmAction(null);
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Cabeçalho colapsável */}
      <button
        className="w-full flex items-center justify-between gap-3 p-3 hover:bg-muted/50 transition text-left"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{SERVICE_LABELS[req.service_type] || req.service_type}</span>
            {req.service_number && (
              <span className="text-xs font-mono text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Hash className="w-2.5 h-2.5" />{req.service_number}
              </span>
            )}
            <Badge className={cn('text-[10px] border px-1.5 py-0', STATUS_COLORS[req.status] || 'bg-gray-100 text-gray-700 border-gray-300')}>
              {req.status?.replace(/_/g, ' ')}
            </Badge>
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

          {/* === DADOS COMPLETOS DA OS === */}
          <div className="bg-card border border-border rounded-xl p-3 space-y-2">
            <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1">
              <FileCheck className="w-3.5 h-3.5 text-primary" /> Dados da Ordem de Serviço
            </p>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {req.service_number && (
                <div className="col-span-2 flex items-center gap-1.5 bg-primary/5 border border-primary/20 rounded-lg px-2 py-1.5">
                  <Hash className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground">N° Assistência:</span>
                  <span className="font-bold text-primary font-mono">{req.service_number}</span>
                </div>
              )}

              <div>
                <span className="text-muted-foreground">Tipo de serviço:</span>
                <p className="font-semibold text-foreground">{SERVICE_LABELS[req.service_type] || req.service_type}</p>
              </div>

              <div>
                <span className="text-muted-foreground">Modalidade:</span>
                <p className="font-semibold text-foreground capitalize">{req.modality === 'imediato' ? 'Imediato' : 'Agendado'}</p>
              </div>

              {req.scheduled_date && (
                <div>
                  <span className="text-muted-foreground">Data agendada:</span>
                  <p className="font-semibold">{new Date(req.scheduled_date + 'T00:00').toLocaleDateString('pt-BR')}{req.scheduled_time ? ` às ${req.scheduled_time}` : ''}</p>
                </div>
              )}

              <div>
                <span className="text-muted-foreground">Status atual:</span>
                <Badge className={cn('text-[10px] border mt-0.5', STATUS_COLORS[req.status])}>{req.status?.replace(/_/g, ' ')}</Badge>
              </div>

              <div>
                <span className="text-muted-foreground">Cliente:</span>
                <p className="font-semibold">{req.client_name}</p>
              </div>

              {req.client_phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-3" />
                  <div>
                    <span className="text-muted-foreground">Telefone:</span>
                    <p className="font-semibold">{req.client_phone}</p>
                  </div>
                </div>
              )}

              <div className="col-span-2">
                <span className="text-muted-foreground">Endereço:</span>
                <p className="font-semibold flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  {req.address}{req.number ? `, ${req.number}` : ''}{req.neighborhood ? ` - ${req.neighborhood}` : ''}{req.city ? `, ${req.city}` : ''}{req.state ? `/${req.state}` : ''}
                  {req.cep && <span className="text-muted-foreground ml-1">CEP {req.cep}</span>}
                </p>
              </div>

              {/* Distância (KM) para reboque */}
              {req.tow_distance_km > 0 && (
                <div className="col-span-2 flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5">
                  <Car className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span className="text-muted-foreground">Distância reboque:</span>
                  <span className="font-bold text-blue-700">{req.tow_distance_km.toFixed(1)} km</span>
                </div>
              )}

              {req.estimated_arrival_minutes > 0 && (
                <div>
                  <span className="text-muted-foreground">Tempo de chegada:</span>
                  <p className="font-semibold">{req.estimated_arrival_minutes} min</p>
                </div>
              )}
            </div>
          </div>

          {/* Descrição do problema */}
          {req.description && (
            <div className="bg-muted/40 rounded-xl p-3">
              <p className="text-xs font-semibold text-foreground mb-1">Descrição do problema:</p>
              <p className="text-xs text-muted-foreground">{req.description}</p>
            </div>
          )}

          {/* === VALORES === */}
          <div className="bg-card border border-border rounded-xl p-3 space-y-2">
            <p className="text-xs font-bold text-foreground mb-1 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-primary" /> Valores
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {req.estimated_price > 0 && (
                <div>
                  <span className="text-muted-foreground">Estimado:</span>
                  <p className="font-semibold">R$ {Number(req.estimated_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              )}
              {req.original_price > 0 && (
                <div>
                  <span className="text-muted-foreground">Preço original:</span>
                  <p className="font-semibold line-through text-muted-foreground">R$ {Number(req.original_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              )}
              {req.discount_amount > 0 && (
                <div>
                  <span className="text-muted-foreground">Desconto:</span>
                  <p className="font-semibold text-green-700">- R$ {Number(req.discount_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              )}
              {req.final_price > 0 && (
                <div className="col-span-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                  <span className="text-muted-foreground text-xs">Valor pago pelo cliente:</span>
                  <p className="font-extrabold text-primary text-base">R$ {Number(req.final_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              )}
            </div>

            {/* Adicionais de preço */}
            <div className="flex flex-wrap gap-2 mt-1">
              {req.night_surcharge && <span className="text-[10px] bg-indigo-100 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded-full">🌙 Taxa noturna +30%</span>}
              {req.weekend_surcharge && <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">📅 Taxa sábado +40%</span>}
              {req.holiday_surcharge && <span className="text-[10px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full">🎉 Taxa feriado +70%</span>}
              {req.coupon_code && <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full">🎫 Cupom: {req.coupon_code}</span>}
            </div>
          </div>

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
              <p className="text-xs text-green-600">Concluído em: {new Date(cl.completed_at).toLocaleString('pt-BR')}</p>
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

          {/* === AÇÕES === */}
          {confirmAction ? (
            <div className={cn('border rounded-xl p-3 space-y-2',
              confirmAction === 'recusar' ? 'bg-red-50 border-red-300' :
              confirmAction === 'voltar' ? 'bg-amber-50 border-amber-300' : 'bg-green-50 border-green-300'
            )}>
              <p className={cn('text-xs font-bold flex items-center gap-1',
                confirmAction === 'recusar' ? 'text-red-700' :
                confirmAction === 'voltar' ? 'text-amber-700' : 'text-green-700'
              )}>
                <AlertCircle className="w-3.5 h-3.5" />
                {confirmAction === 'recusar' ? 'Confirmar recusa desta OS?' :
                 confirmAction === 'voltar' ? 'Devolver OS para o cliente?' :
                 'Confirmar conclusão desta OS?'}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 rounded-lg text-xs h-7" onClick={() => setConfirmAction(null)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className={cn('flex-1 rounded-lg text-xs h-7 text-white',
                    confirmAction === 'recusar' ? 'bg-red-600 hover:bg-red-700' :
                    confirmAction === 'voltar' ? 'bg-amber-500 hover:bg-amber-600' :
                    'bg-green-600 hover:bg-green-700'
                  )}
                  onClick={() => handleAction(confirmAction)}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap pt-1">
              <Button size="sm" variant="outline"
                className="flex-1 rounded-xl text-xs border-red-300 text-red-700 hover:bg-red-50 gap-1"
                onClick={() => setConfirmAction('recusar')}>
                <ThumbsDown className="w-3 h-3" /> Recusar
              </Button>
              <Button size="sm" variant="outline"
                className="flex-1 rounded-xl text-xs border-amber-300 text-amber-700 hover:bg-amber-50 gap-1"
                onClick={() => setConfirmAction('voltar')}>
                <RotateCcw className="w-3 h-3" /> Voltar ao Cliente
              </Button>
              <Button size="sm"
                className="flex-1 rounded-xl text-xs bg-green-600 hover:bg-green-700 text-white gap-1"
                onClick={() => setConfirmAction('ok')}>
                <ThumbsUp className="w-3 h-3" /> OK / Aprovar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProviderGroup({ group, defaultOpen, onStatusChange }) {
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
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProviderServiceReview({ period }) {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('concluido');
  const [selectedProviderId, setSelectedProviderId] = useState('todos');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests-for-review', filterStatus],
    queryFn: () => base44.entities.ServiceRequest.filter({ status: filterStatus }, '-created_date', 500),
  });

  const changeStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.ServiceRequest.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requests-for-review'] }),
    onError: () => toast.error('Erro ao atualizar status'),
  });

  const handleStatusChange = async (id, status) => {
    await changeStatusMutation.mutateAsync({ id, status });
  };

  // Filtra por período se fornecido
  const filtered = period
    ? requests.filter(r => {
        const d = r.created_date ? new Date(r.created_date) : null;
        if (!d) return false;
        const start = new Date(period.start + 'T00:00:00');
        const end = new Date(period.end + 'T23:59:59');
        return d >= start && d <= end;
      })
    : requests;

  const allGroups = groupByProvider(filtered);

  // Filtra por prestador selecionado
  const groups = selectedProviderId === 'todos'
    ? allGroups
    : allGroups.filter(g => g.provider_id === selectedProviderId);

  const displayedRequests = groups.flatMap(g => g.requests);
  const totalGeral = displayedRequests.reduce((s, r) => s + (r.final_price || 0), 0);
  const withChecklist = displayedRequests.filter(r => r.checklist?.completed_at).length;

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

        {/* Seletor de prestador */}
        {!isLoading && allGroups.length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <User className="w-3 h-3" /> Filtrar por prestador
            </label>
            <select
              value={selectedProviderId}
              onChange={e => setSelectedProviderId(e.target.value)}
              className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="todos">Todos os prestadores ({allGroups.length})</option>
              {allGroups.map(g => (
                <option key={g.provider_id} value={g.provider_id}>
                  {g.provider_name} — {g.requests.length} atendimento(s) · R$ {g.requests.reduce((s, r) => s + (r.final_price || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Resumo */}
      {!isLoading && displayedRequests.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <p className="text-xl font-black text-blue-800">{displayedRequests.length}</p>
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
        <ProviderGroup key={group.provider_id} group={group} defaultOpen={selectedProviderId !== 'todos'} onStatusChange={handleStatusChange} />
      ))}
    </div>
  );
}