import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const SPECIALTIES = [
  "Elétrica", "Hidráulica", "Pintura", "Reparo Geral",
  "Montagem", "Alvenaria", "Fechadura", "Ar Condicionado",
];

export default function ProviderSetupModal({ user, onCreated }) {
  const [form, setForm] = useState({
    name: user?.full_name || '',
    phone: '',
    city: '',
    state: '',
    bio: '',
    specialties: [],
    experience_years: '',
  });

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));
  const toggleSpec = (s) => setForm(prev => ({
    ...prev,
    specialties: prev.specialties.includes(s) ? prev.specialties.filter(x => x !== s) : [...prev.specialties, s],
  }));

  const createProvider = useMutation({
    mutationFn: () => base44.entities.Provider.create({
      ...form,
      user_id: user?.id || '',
      experience_years: Number(form.experience_years) || 0,
      is_online: false,
      is_approved: false,
    }),
    onSuccess: onCreated,
  });

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <Wrench className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Cadastre-se como Prestador</h1>
        <p className="text-muted-foreground mt-2 text-sm">Preencha seus dados para começar a receber chamados</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Nome completo</Label>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Seu nome" className="rounded-2xl" />
        </div>
        <div className="space-y-2">
          <Label>WhatsApp / Telefone</Label>
          <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999" className="rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Sua cidade" className="rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Label>Anos de exp.</Label>
            <Input type="number" value={form.experience_years} onChange={e => set('experience_years', e.target.value)} placeholder="Ex: 5" className="rounded-2xl" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Especialidades</Label>
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES.map(s => (
              <button
                key={s}
                onClick={() => toggleSpec(s)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition-all",
                  form.specialties.includes(s) ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Sobre você (opcional)</Label>
          <Textarea value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Descreva sua experiência e diferenciais..." className="rounded-2xl" />
        </div>

        <Button
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base mt-2"
          onClick={() => createProvider.mutate()}
          disabled={!form.name || !form.phone || !form.city || form.specialties.length === 0 || createProvider.isPending}
        >
          {createProvider.isPending ? "Enviando..." : "Enviar cadastro para aprovação"}
        </Button>
      </div>
    </div>
  );
}