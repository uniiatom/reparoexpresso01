import React, { useState } from 'react';
import { X, Star, Phone, Mail, MapPin, Briefcase, Calendar, User, IdCard, ShieldCheck, ShieldOff } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const SPECIALTY_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Condicionado", outros: "Outros",
};

export default function ProviderDetailsModal({ provider, onClose, onApprove, onReject, onBlock }) {
  const [blockReason, setBlockReason] = useState('');
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  if (!provider) return null;

  const fields = [
    { label: "Nome completo", value: provider.name },
    { label: "Telefone", value: provider.phone, icon: Phone },
    { label: "E-mail", value: provider.email, icon: Mail },
    { label: "CPF", value: provider.cpf, icon: IdCard },
    { label: "RG", value: provider.rg, icon: IdCard },
    { label: "Data de nascimento", value: provider.birth_date, icon: Calendar },
    { label: "Endereço", value: [provider.address, provider.neighborhood, provider.city, provider.state].filter(Boolean).join(', '), icon: MapPin },
    { label: "CEP", value: provider.zip_code },
    { label: "Anos de experiência", value: provider.experience_years != null ? `${provider.experience_years} anos` : null, icon: Briefcase },
    { label: "Biografia", value: provider.bio },
  ];

  const handleBlock = async () => {
    if (onBlock) {
      await onBlock(provider.id, blockReason);
      setBlockReason('');
      setShowBlockForm(false);
      onClose();
    }
  };

  const handleReject = async () => {
    if (onReject) {
      await onReject(provider.id, rejectReason);
      setRejectReason('');
      setShowRejectForm(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-6 px-4">
      <div className="bg-card rounded-3xl shadow-2xl w-full max-w-lg relative">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Ficha do Prestador</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Foto e status */}
          <div className="flex items-center gap-4">
            {provider.photo_url ? (
              <img src={provider.photo_url} alt={provider.name} className="w-20 h-20 rounded-2xl object-cover border border-border" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-3xl font-bold text-primary">{provider.name?.charAt(0)}</span>
              </div>
            )}
            <div>
              <p className="text-xl font-bold text-foreground">{provider.name}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {provider.is_blocked
                  ? <Badge className="bg-red-100 text-red-800 border-0 text-xs">🚫 Bloqueado</Badge>
                  : provider.is_rejected
                  ? <Badge className="bg-orange-100 text-orange-800 border-0 text-xs">❌ Reprovado</Badge>
                  : provider.is_approved
                  ? <Badge className="bg-green-100 text-green-800 border-0 text-xs">✓ Aprovado</Badge>
                  : <Badge className="bg-yellow-100 text-yellow-800 border-0 text-xs">⏳ Pendente</Badge>}
                {provider.is_online && <Badge className="bg-primary/10 text-primary border-0 text-xs">🟢 Online</Badge>}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={cn("w-3.5 h-3.5", s <= Math.round(provider.rating || 5) ? "text-yellow-400 fill-yellow-400" : "text-muted")} />
                ))}
                <span className="text-xs text-muted-foreground ml-1">{provider.total_jobs || 0} serviços · {(provider.rating || 5).toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Aviso de reprovação */}
          {provider.is_rejected && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 space-y-2">
              <p className="text-sm font-bold text-orange-800">❌ Prestador Reprovado</p>
              {provider.rejection_reason && (
                <p className="text-xs text-orange-700">{provider.rejection_reason}</p>
              )}
              {provider.rejected_at && (
                <p className="text-xs text-orange-600">Reprovado em {new Date(provider.rejected_at).toLocaleDateString('pt-BR')}</p>
              )}
            </div>
          )}

          {/* Aviso de bloqueio */}
          {provider.is_blocked && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 space-y-2">
              <p className="text-sm font-bold text-red-800">🚫 Prestador Bloqueado</p>
              {provider.block_reason && (
                <p className="text-xs text-red-700">{provider.block_reason}</p>
              )}
              {provider.blocked_at && (
                <p className="text-xs text-red-600">Bloqueado em {new Date(provider.blocked_at).toLocaleDateString('pt-BR')}</p>
              )}
            </div>
          )}

          {/* Foto de corpo inteiro */}
          {provider.photo_body_url && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Foto de corpo inteiro</p>
              <img src={provider.photo_body_url} alt="Corpo inteiro" className="w-full max-h-64 object-contain rounded-2xl border border-border" />
            </div>
          )}

          {/* Dados cadastrais */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dados Cadastrais</p>
            <div className="space-y-2">
              {fields.map(f => f.value ? (
                <div key={f.label} className="flex gap-3 py-2 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground w-36 flex-shrink-0 pt-0.5">{f.label}</span>
                  <span className="text-sm text-foreground font-medium break-all">{f.value}</span>
                </div>
              ) : null)}
            </div>
          </div>

          {/* Especialidades */}
          {provider.specialties?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Especialidades</p>
              <div className="flex flex-wrap gap-2">
                {provider.specialties.map(s => (
                  <span key={s} className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full">
                    {SPECIALTY_LABELS[s] || s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Formulário de reprovação */}
          {showRejectForm && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 space-y-3">
              <p className="text-sm font-bold text-orange-800">Motivo da reprovação</p>
              <Textarea
                placeholder="Descreva o motivo da reprovação..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="rounded-xl"
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold"
                  onClick={handleReject}
                >
                  Confirmar Reprovação
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectReason('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Formulário de bloqueio */}
          {showBlockForm && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 space-y-3">
              <p className="text-sm font-bold text-red-800">Motivo do bloqueio</p>
              <Textarea
                placeholder="Descreva o motivo do bloqueio..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="rounded-xl"
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
                  onClick={handleBlock}
                >
                  Confirmar Bloqueio
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => {
                    setShowBlockForm(false);
                    setBlockReason('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Ações */}
          {!provider.is_blocked && !provider.is_rejected && (
            <div className="flex gap-3 pt-2 flex-wrap">
              {!provider.is_approved ? (
                <>
                  <Button className="flex-1 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => { onApprove(provider.id, true); onClose(); }}>
                    <ShieldCheck className="w-4 h-4 mr-2" /> Aprovar
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-2xl text-orange-600 border-orange-300 hover:bg-orange-50" onClick={() => setShowRejectForm(true)}>
                    ❌ Reprovar
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-2xl text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => setShowBlockForm(true)}>
                    <ShieldOff className="w-4 h-4 mr-2" /> Bloquear
                  </Button>
                </>
              ) : (
                <Button variant="outline" className="flex-1 rounded-2xl text-destructive border-destructive/30" onClick={() => setShowBlockForm(true)}>
                  <ShieldOff className="w-4 h-4 mr-2" /> Bloquear prestador
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}