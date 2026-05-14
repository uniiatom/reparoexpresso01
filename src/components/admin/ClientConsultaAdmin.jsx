import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, User, Phone, MapPin, CheckCircle2, ChevronDown, ChevronUp, Image, ClipboardList, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS = {
  aguardando: "bg-yellow-100 text-yellow-800",
  aceito: "bg-blue-100 text-blue-800",
  a_caminho: "bg-blue-100 text-blue-800",
  em_andamento: "bg-purple-100 text-purple-800",
  em_espera: "bg-yellow-100 text-yellow-700",
  agendado: "bg-blue-100 text-blue-700",
  concluido: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

const STATUS_LABELS = {
  aguardando: "Aguardando", aceito: "Aceito", a_caminho: "A caminho",
  em_andamento: "Em andamento", em_espera: "Em espera", agendado: "Agendado",
  concluido: "Concluído", cancelado: "Cancelado",
};

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Condicionado",
  limpeza_caixa_dagua: "Limpeza Caixa d'Água", desentupimento: "Desentupimento",
    instalacao_suporte_tv: "Suporte de TV",
    outros: "Outros",
};

export default function ClientConsultaAdmin() {
  const [cpfInput, setCpfInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState(null);
  const [requests, setRequests] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [expandedChecklist, setExpandedChecklist] = useState(null);

  const handleSearch = async () => {
    const cpf = cpfInput.replace(/\D/g, '');
    if (cpf.length < 5) return;
    setLoading(true);
    setClient(null);
    setRequests([]);
    setNotFound(false);
    setExpandedChecklist(null);

    // Busca pelo CPF no cadastro de clientes
    const clients = await base44.entities.Client.filter({ cpf });
    const foundClient = clients[0] || null;
    setClient(foundClient);

    // Busca OS pelo nome do cliente ou cpf (via client_name match ou client_id)
    let allRequests = [];
    if (foundClient) {
      allRequests = await base44.entities.ServiceRequest.filter({ client_id: foundClient.user_id || '' }, '-created_date', 500);
      // Se não retornou, tenta por nome
      if (allRequests.length === 0 && foundClient.name) {
        const all = await base44.entities.ServiceRequest.list('-created_date', 500);
        allRequests = all.filter(r =>
          r.client_name?.toLowerCase() === foundClient.name?.toLowerCase() ||
          r.client_phone === foundClient.phone
        );
      }
    } else {
      // Tenta buscar diretamente nas OS pelo CPF no campo client_name ou phone
      const all = await base44.entities.ServiceRequest.list('-created_date', 500);
      allRequests = all.filter(r => {
        const phone = cpfInput.replace(/\D/g, '');
        return r.client_phone?.replace(/\D/g, '').includes(phone) ||
               r.client_name?.toLowerCase().includes(cpfInput.toLowerCase());
      });
    }

    setRequests(allRequests);
    if (!foundClient && allRequests.length === 0) setNotFound(true);
    setLoading(false);
  };

  const completedRequests = requests.filter(r => r.status === 'concluido');
  const activeRequests = requests.filter(r => !['concluido', 'cancelado'].includes(r.status));
  const withChecklist = requests.filter(r => r.checklist?.completed_at);

  return (
    <div className="space-y-5">
      {/* Campo de busca */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <User className="w-4 h-4 text-primary" /> Consulta de Cliente
        </h3>
        <p className="text-sm text-muted-foreground">Digite o CPF, telefone ou nome do cliente para puxar a ficha completa.</p>
        <div className="flex gap-2">
          <Input
            placeholder="CPF, telefone ou nome..."
            value={cpfInput}
            onChange={e => setCpfInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="rounded-xl flex-1"
          />
          <Button onClick={handleSearch} disabled={loading || cpfInput.trim().length < 3} className="rounded-xl px-5">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Não encontrado */}
      {notFound && (
        <div className="text-center py-10 text-muted-foreground">
          <User className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Nenhum cliente ou atendimento encontrado.</p>
        </div>
      )}

      {/* Ficha do cliente */}
      {(client || requests.length > 0) && (
        <div className="space-y-5">

          {/* Card ficha */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-primary">
                    {(client?.name || requests[0]?.client_name || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 space-y-1">
                  <p className="font-bold text-foreground text-lg">{client?.name || requests[0]?.client_name || '—'}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {client?.phone || requests[0]?.client_phone || '—'}
                  </p>
                  {client?.cpf && (
                    <p className="text-sm text-muted-foreground">🪪 CPF: {client.cpf}</p>
                  )}
                  {requests[0]?.city && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {requests[0]?.city}
                    </p>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <div className="text-2xl font-black text-primary">{requests.length}</div>
                  <div className="text-xs text-muted-foreground">atendimento(s)</div>
                  <div className="text-sm font-semibold text-green-600">{completedRequests.length} concluído(s)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumo rápido */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
              <p className="text-2xl font-black text-green-700">{completedRequests.length}</p>
              <p className="text-xs text-green-600 font-semibold">Concluídos</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center">
              <p className="text-2xl font-black text-blue-700">{activeRequests.length}</p>
              <p className="text-xs text-blue-600 font-semibold">Em aberto</p>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3 text-center">
              <p className="text-2xl font-black text-primary">{withChecklist.length}</p>
              <p className="text-xs text-primary font-semibold">Checklists</p>
            </div>
          </div>

          {/* Histórico de atendimentos */}
          {requests.length > 0 && (
            <div>
              <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Histórico de Atendimentos
              </h4>
              <div className="space-y-3">
                {requests.map(req => {
                  const cl = req.checklist;
                  const hasChecklist = cl?.completed_at;
                  const isChecklistOpen = expandedChecklist === req.id;

                  return (
                    <Card key={req.id} className="overflow-hidden">
                      <CardContent className="p-4 space-y-3">
                        {/* Cabeçalho OS */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground text-sm">
                                {SERVICE_LABELS[req.service_type] || req.service_type}
                              </span>
                              {req.service_number && (
                                <span className="text-xs font-mono text-primary/70 bg-primary/10 px-2 py-0.5 rounded">
                                  {req.service_number}
                                </span>
                              )}
                              <Badge className={cn("text-xs border-0", STATUS_COLORS[req.status])}>
                                {STATUS_LABELS[req.status] || req.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{req.description}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {req.address}{req.city ? `, ${req.city}` : ''}
                            </p>
                            {req.provider_name && (
                              <p className="text-xs text-muted-foreground mt-0.5">🔧 {req.provider_name}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              📅 {req.created_date ? new Date(req.created_date).toLocaleDateString('pt-BR') : '—'}
                            </p>
                          </div>
                          {req.final_price && (
                            <span className="font-bold text-primary text-sm shrink-0">R$ {req.final_price}</span>
                          )}
                        </div>

                        {/* Checklist desta OS */}
                        {hasChecklist && (
                          <div className="border-t border-border pt-3">
                            <button
                              className="w-full flex items-center justify-between text-left"
                              onClick={() => setExpandedChecklist(isChecklistOpen ? null : req.id)}
                            >
                              <span className="text-xs font-semibold text-primary flex items-center gap-1">
                                <ClipboardList className="w-3.5 h-3.5" /> Ver Checklist
                                {(() => {
                                  const total = cl.items?.length || 0;
                                  const checked = cl.items?.filter(i => i.checked).length || 0;
                                  return total > 0 ? ` (${checked}/${total})` : '';
                                })()}
                              </span>
                              {isChecklistOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                            </button>

                            {isChecklistOpen && (
                              <div className="mt-3 space-y-3">
                                {/* Itens */}
                                {cl.items?.length > 0 && (
                                  <div className="space-y-1">
                                    {cl.items.map((item, idx) => (
                                      <div key={idx} className={cn("flex items-center gap-2 px-3 py-2 rounded-xl text-xs",
                                        item.checked ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700")}>
                                        <CheckCircle2 className={cn("w-3.5 h-3.5 flex-shrink-0", item.checked ? "text-green-500" : "text-red-400")} />
                                        {item.label}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Assinaturas */}
                                {(cl.pre_auth_signature || cl.final_signature) && (
                                  <div className="grid grid-cols-2 gap-2">
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
                                )}

                                {/* Fotos */}
                                {cl.photos?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
                                      <Image className="w-3 h-3" /> Fotos ({cl.photos.length})
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {cl.photos.map((url, idx) => (
                                        <a key={idx} href={url} target="_blank" rel="noreferrer">
                                          <img src={url} alt={`Foto ${idx + 1}`} className="w-16 h-16 object-cover rounded-xl border border-border" />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Observações */}
                                {cl.notes && (
                                  <p className="text-xs text-muted-foreground bg-muted rounded-xl p-3">
                                    📝 {cl.notes}
                                  </p>
                                )}

                                {/* Localização */}
                                {cl.location && (
                                  <p className="text-xs text-muted-foreground bg-muted rounded-xl p-3">
                                    📍 {cl.location.latitude?.toFixed(5)}, {cl.location.longitude?.toFixed(5)}
                                    {cl.location.accuracy && ` · ~${Math.round(cl.location.accuracy)}m`}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}