import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Camera, CheckCircle2, CreditCard, Smartphone, Phone, Calendar, Shield } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

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

  const canSubmit = form.name.length > 2 && form.phone.length > 7;

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="text-center max-w-sm w-full">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-40" />
            <div className="relative w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Cadastro realizado!</h2>
          <p className="text-muted-foreground mb-8">Agora você pode solicitar serviços com facilidade.</p>
          <Button
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base"
            onClick={() => navigate('/solicitar')}
          >
            Solicitar meu primeiro serviço 🔧
          </Button>
          <button onClick={() => navigate('/')} className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Ir para o início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-accent rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Criar conta de cliente</h1>
          <p className="text-xs text-muted-foreground">É rápido e gratuito</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-8">

        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative group cursor-pointer">
            <label className="cursor-pointer">
              <div className={cn(
                "w-28 h-28 rounded-full border-4 border-dashed border-primary/30 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary",
                form.photo_url ? "border-solid border-primary/50" : ""
              )}>
                {form.photo_url ? (
                  <img src={form.photo_url} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground group-hover:text-primary transition-colors">
                    <User className="w-8 h-8" />
                    <span className="text-xs font-medium">Foto</span>
                  </div>
                )}
              </div>
              {photoUploading && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <div className="absolute bottom-1 right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <Camera className="w-4 h-4 text-primary-foreground" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>
          <p className="text-sm text-muted-foreground mt-3">Toque para adicionar uma foto</p>
        </div>

        {/* Campos */}
        <div className="space-y-5">
          {/* Nome */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Nome completo <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Como você se chama?"
              className="rounded-2xl h-12 text-base"
            />
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" /> WhatsApp / Telefone <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="(11) 99999-9999"
              className="rounded-2xl h-12 text-base"
              type="tel"
            />
          </div>

          {/* CPF */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" /> CPF <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              value={form.cpf}
              onChange={e => set('cpf', e.target.value)}
              placeholder="000.000.000-00"
              className="rounded-2xl h-12 text-base"
            />
          </div>

          {/* Data nascimento */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Data de nascimento <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              type="date"
              value={form.birth_date}
              onChange={e => set('birth_date', e.target.value)}
              className="rounded-2xl h-12 text-base"
            />
          </div>
        </div>

        {/* Pagamentos aceitos */}
        <div className="bg-primary/5 rounded-3xl p-5 border border-primary/15">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold text-foreground">Formas de pagamento aceitas</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 bg-card rounded-2xl p-3 border border-border">
              <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Cartão</p>
                <p className="text-xs text-muted-foreground">Crédito / débito</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-card rounded-2xl p-3 border border-border">
              <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">PIX</p>
                <p className="text-xs text-muted-foreground">Instantâneo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Botão */}
        <Button
          className="w-full h-14 rounded-2xl font-bold text-base"
          onClick={() => createClient.mutate()}
          disabled={!canSubmit || createClient.isPending}
        >
          {createClient.isPending ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Salvando...
            </div>
          ) : (
            "Criar minha conta ✨"
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Ao criar sua conta, você concorda com nossos{' '}
          <button onClick={() => navigate('/termos-cliente')} className="text-primary underline">termos de uso</button>.
        </p>
      </div>
    </div>
  );
}