import React from 'react';
import { X, Star, Phone, Mail, MapPin, Briefcase, Calendar, User, IdCard, ShieldCheck, ShieldOff } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SPECIALTY_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Condicionado", outros: "Outros",
};

export default function ProviderDetailsModal({ provider, onClose, onApprove, onBlock }) {
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
                {provider.is_approved
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

          {/* Ações */}
          <div className="flex gap-3 pt-2">
            {!provider.is_approved ? (
              <Button className="flex-1 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => { onApprove(provider.id, true); onClose(); }}>
                <ShieldCheck className="w-4 h-4 mr-2" /> Aprovar prestador
              </Button>
            ) : (
              <Button variant="outline" className="flex-1 rounded-2xl text-destructive border-destructive/30" onClick={() => { onApprove(provider.id, false); onClose(); }}>
                <ShieldOff className="w-4 h-4 mr-2" /> Bloquear prestador
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}