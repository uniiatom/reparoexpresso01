import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MapPin, Zap, Droplets, Paintbrush, Wrench, Settings, Hammer, Lock, Wind, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SERVICE_TYPES = [
  { value: "eletrica", label: "Elétrica", icon: Zap },
  { value: "hidraulica", label: "Hidráulica", icon: Droplets },
  { value: "pintura", label: "Pintura", icon: Paintbrush },
  { value: "reparo_geral", label: "Reparo Geral", icon: Wrench },
  { value: "montagem", label: "Montagem", icon: Settings },
  { value: "alvenaria", label: "Alvenaria", icon: Hammer },
  { value: "fechadura", label: "Fechadura", icon: Lock },
  { value: "ar_condicionado", label: "Ar Condicionado", icon: Wind },
  { value: "outros", label: "Outros", icon: Wrench },
];

const URGENCY = [
  { value: "agora", label: "Agora", desc: "Preciso urgente" },
  { value: "hoje", label: "Hoje", desc: "No mesmo dia" },
  { value: "esta_semana", label: "Esta semana", desc: "Sem pressa" },
];

export default function SolicitarServico() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    service_type: urlParams.get('tipo') || '',
    description: '',
    address: '',
    city: '',
    urgency: 'agora',
    client_name: '',
    client_phone: '',
  });

  const createRequest = useMutation({
    mutationFn: (data) => base44.entities.ServiceRequest.create({ ...data, status: 'aguardando' }),
    onSuccess: (result) => navigate(`/acompanhar/${result.id}`),
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const canNext = () => {
    if (step === 1) return !!form.service_type;
    if (step === 2) return form.description.length > 5;
    if (step === 3) return form.address.length > 3;
    if (step === 4) return form.client_name.length > 2 && form.client_phone.length > 7;
    return true;
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/')} className="p-2 hover:bg-accent rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">Passo {step} de 4</p>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Step 1: Tipo */}
      {step === 1 && (
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">Qual serviço?</h2>
          <p className="text-muted-foreground mb-6">Selecione o tipo de serviço que precisa</p>
          <div className="grid grid-cols-3 gap-3">
            {SERVICE_TYPES.map(s => {
              const Icon = s.icon;
              const selected = form.service_type === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => set('service_type', s.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                    selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  )}
                >
                  <Icon className={cn("w-7 h-7", selected ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-medium text-center", selected ? "text-primary" : "text-foreground")}>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Descrição + Urgência */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Descreva o problema</h2>
            <p className="text-muted-foreground mb-4">Quanto mais detalhes, melhor</p>
          </div>
          <div className="space-y-2">
            <Label>O que está acontecendo?</Label>
            <Textarea
              placeholder="Ex: Tomada não funciona no quarto, chuveiro vazando, porta não abre..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className="min-h-[120px] rounded-2xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Urgência</Label>
            <div className="grid grid-cols-3 gap-2">
              {URGENCY.map(u => (
                <button
                  key={u.value}
                  onClick={() => set('urgency', u.value)}
                  className={cn(
                    "p-3 rounded-2xl border-2 text-left transition-all",
                    form.urgency === u.value ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <p className={cn("font-semibold text-sm", form.urgency === u.value ? "text-primary" : "text-foreground")}>{u.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{u.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Endereço */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Onde é o serviço?</h2>
            <p className="text-muted-foreground mb-4">Informe o endereço completo</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Endereço</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rua, número, bairro..."
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  className="pl-10 rounded-2xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input placeholder="Sua cidade" value={form.city} onChange={e => set('city', e.target.value)} className="rounded-2xl" />
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Dados do cliente */}
      {step === 4 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Seus dados</h2>
            <p className="text-muted-foreground mb-4">Para o prestador entrar em contato</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input placeholder="Seu nome" value={form.client_name} onChange={e => set('client_name', e.target.value)} className="rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp / Telefone</Label>
              <Input placeholder="(11) 99999-9999" value={form.client_phone} onChange={e => set('client_phone', e.target.value)} className="rounded-2xl" />
            </div>
          </div>
          <div className="bg-primary/5 rounded-2xl p-4 border border-primary/20">
            <p className="text-sm font-semibold text-foreground mb-2">Resumo do pedido</p>
            <p className="text-sm text-muted-foreground">📍 {form.address}{form.city ? `, ${form.city}` : ''}</p>
            <p className="text-sm text-muted-foreground mt-1">🔧 {SERVICE_TYPES.find(s => s.value === form.service_type)?.label}</p>
            <p className="text-sm text-muted-foreground mt-1">⚡ {URGENCY.find(u => u.value === form.urgency)?.label}</p>
          </div>
        </div>
      )}

      <div className="mt-8">
        {step < 4 ? (
          <Button
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext()}
            className="w-full h-14 rounded-2xl font-bold text-base bg-primary text-primary-foreground"
          >
            Continuar <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        ) : (
          <Button
            onClick={() => createRequest.mutate(form)}
            disabled={!canNext() || createRequest.isPending}
            className="w-full h-14 rounded-2xl font-bold text-base bg-primary text-primary-foreground"
          >
            {createRequest.isPending ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : "Buscar Prestador 🔧"}
          </Button>
        )}
      </div>
    </div>
  );
}