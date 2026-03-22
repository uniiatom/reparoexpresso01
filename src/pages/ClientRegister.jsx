import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Camera, CheckCircle2, CreditCard, Banknote, Smartphone, Info } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function ClientRegister() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.full_name || '',
    phone: '',
    cpf: '',
    birth_date: '',
    photo_url: '',
  });
  const [photoUploading, setPhotoUploading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('photo_url', file_url);
    setPhotoUploading(false);
  };

  const createClient = useMutation({
    mutationFn: () => base44.entities.Client.create({
      ...form,
      user_id: user?.id || '',
    }),
    onSuccess: () => setDone(true),
  });

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Cadastro realizado!</h2>
          <p className="text-muted-foreground mt-2">Agora você pode solicitar serviços.</p>
          <Button className="mt-6 w-full rounded-2xl bg-primary text-primary-foreground font-bold" onClick={() => navigate('/solicitar')}>
            Solicitar serviço
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-accent rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Cadastro de Cliente</h1>
      </div>

      {/* Foto de perfil */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-muted overflow-hidden border-4 border-border flex items-center justify-center">
            {form.photo_url ? (
              <img src={form.photo_url} alt="Foto" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-lg">
            {photoUploading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Camera className="w-4 h-4 text-primary-foreground" />
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>
        </div>
        <p className="text-sm text-muted-foreground mt-2">Adicionar foto (opcional)</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Nome completo *</Label>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Seu nome completo" className="rounded-2xl h-12" />
        </div>
        <div className="space-y-2">
          <Label>WhatsApp / Telefone *</Label>
          <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999" className="rounded-2xl h-12" />
        </div>
        <div className="space-y-2">
          <Label>CPF</Label>
          <Input value={form.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" className="rounded-2xl h-12" />
        </div>
        <div className="space-y-2">
          <Label>Data de nascimento</Label>
          <Input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} className="rounded-2xl h-12" />
        </div>

        {/* Informações de pagamento */}
        <div className="mt-2 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold text-foreground">Formas de pagamento aceitas</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center gap-1.5 bg-background rounded-xl p-3 border border-border">
              <CreditCard className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium text-foreground text-center">Cartão de crédito / débito</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 bg-background rounded-xl p-3 border border-border">
              <Smartphone className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium text-foreground text-center">Pix</span>
            </div>

          </div>

        </div>

        <Button
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base mt-2"
          onClick={() => createClient.mutate()}
          disabled={!form.name || !form.phone || createClient.isPending}
        >
          {createClient.isPending ? "Salvando..." : "Criar conta"}
        </Button>
      </div>
    </div>
  );
}