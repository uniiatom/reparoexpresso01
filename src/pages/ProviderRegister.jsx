import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, ChevronRight, Wrench, User, MapPin, FileText,
  GraduationCap, CheckCircle2, Loader2, Camera
} from "lucide-react";
import { cn } from "@/lib/utils";

const SPECIALTIES = [
  { label: "Elétrica", icon: "⚡" },
  { label: "Hidráulica", icon: "💧" },
  { label: "Pintura", icon: "🖌️" },
  { label: "Montagem", icon: "⚙️" },
  { label: "Reparo Geral", icon: "🔧" },
  { label: "Alvenaria", icon: "🧱" },
  { label: "Fechadura / Serralheria", icon: "🔐" },
  { label: "Ar Condicionado", icon: "❄️" },
  { label: "Limpeza Caixa d'Água", icon: "🪣" },
  { label: "Limpeza de Calha", icon: "🌧️" },
  { label: "Substituição de Telha", icon: "🏗️" },
  { label: "Limpeza de Telhado", icon: "✨" },
  { label: "Coifa de Parede", icon: "🍳" },
  { label: "Coifa Ilha", icon: "🍽️" },
  { label: "Conversão Vaso CX Acoplada", icon: "🚿" },
  { label: "Vaso Monobloco", icon: "🚽" },
  { label: "Reparo Forro de Gesso", icon: "🏠" },
  { label: "Desentupimento", icon: "🔩" },
  { label: "Caça Vazamento", icon: "🔍" },
  { label: "Check-up", icon: "📋" },
  { label: "Rejunte", icon: "🪟" },
  { label: "Portão Eletrônico", icon: "🚪" },
  { label: "Interfone", icon: "📞" },
  { label: "Pressurizador", icon: "🔧" },
  { label: "Troca de Pneu", icon: "🚗" },
  { label: "Recarga de Bateria", icon: "🔋" },
  { label: "Conserto de Pneu", icon: "🛞" },
  { label: "Reboque", icon: "🚛" },
];

const STEPS = [
  { label: "Dados Pessoais", icon: User },
  { label: "Endereço e Documentos", icon: MapPin },
  { label: "Habilidades", icon: Wrench },
  { label: "Homologação", icon: GraduationCap },
];

export default function ProviderRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [done, setDone] = useState(false);

  const [uploadingFacePhoto, setUploadingFacePhoto] = useState(false);
  const [uploadingBodyPhoto, setUploadingBodyPhoto] = useState(false);

  const [form, setForm] = useState({
    // Pessoais
    name: '',
    phone: '',
    email: '',
    birth_date: '',
    photo_url: '',
    photo_body_url: '',
    // Endereço
    address: '',
    neighborhood: '',
    city: '',
    state: '',
    zip_code: '',
    // Documentos
    cpf: '',
    rg: '',
    // Habilidades
    specialties: [],
    experience_years: '',
    bio: '',
    // Homologação (apenas confirmação)
    accepts_homologation: false,
  });

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const toggleSpecialty = (s) => setForm(prev => ({
    ...prev,
    specialties: prev.specialties.includes(s)
      ? prev.specialties.filter(x => x !== s)
      : [...prev.specialties, s],
  }));

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('photo_url', file_url);
    setUploadingPhoto(false);
  };

  const handleFacePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFacePhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('photo_url', file_url);
    setUploadingFacePhoto(false);
  };

  const handleBodyPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingBodyPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('photo_body_url', file_url);
    setUploadingBodyPhoto(false);
  };

  const canNext = () => {
    if (step === 1) return form.name.length > 2 && form.phone.length > 7 && form.birth_date;
    if (step === 2) return form.address.length > 3 && form.city && form.state && form.zip_code && form.cpf.length >= 11 && form.rg.length >= 5;
    if (step === 3) return form.specialties.length > 0 && form.experience_years;
    if (step === 4) return form.accepts_homologation;
    return false;
  };

  const createProvider = useMutation({
    mutationFn: () => base44.entities.Provider.create({
      name: form.name,
      phone: form.phone,
      email: form.email,
      birth_date: form.birth_date,
      cpf: form.cpf,
      rg: form.rg,
      photo_url: form.photo_url,
      photo_body_url: form.photo_body_url,
      address: form.address,
      neighborhood: form.neighborhood,
      city: form.city,
      state: form.state,
      zip_code: form.zip_code,
      bio: form.bio,
      specialties: form.specialties,
      experience_years: Number(form.experience_years) || 0,
      is_online: false,
      is_approved: false,
      rating: 5,
      total_reviews: 0,
      total_jobs: 0,
    }),
    onSuccess: () => setDone(true),
  });

  const handleSubmit = () => createProvider.mutate();

  // ── SUCESSO ──
  if (done) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Cadastro enviado!</h2>
        <p className="text-muted-foreground text-sm max-w-xs mb-2">
          Recebemos suas informações. Você será convocado para o <strong>teste de homologação na Escola Prática</strong>.
        </p>
        <p className="text-muted-foreground text-sm max-w-xs mb-8">
          Após a aprovação, sua conta será ativada e você começará a receber chamados.
        </p>
        <Button className="w-full max-w-xs h-12 rounded-2xl" onClick={() => navigate('/')}>
          Voltar ao início
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/')}
          className="p-2 hover:bg-accent rounded-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">Passo {step} de {STEPS.length} — {STEPS[step - 1].label}</p>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(step / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── STEP 1: Dados Pessoais ── */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Dados Pessoais</h2>
            <p className="text-muted-foreground text-sm">Informações básicas para sua identificação</p>
          </div>

          {/* Fotos */}
          <div className="space-y-4">
            <Label>Fotos de identificação</Label>
            <div className="grid grid-cols-2 gap-4">
              {/* Foto de rosto */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-full aspect-square rounded-2xl bg-muted overflow-hidden border-2 border-border flex items-center justify-center">
                  {form.photo_url
                    ? <img src={form.photo_url} alt="rosto" className="w-full h-full object-cover" />
                    : <User className="w-10 h-10 text-muted-foreground" />}
                </div>
                <label className={cn(
                  "flex items-center gap-1.5 text-xs font-medium text-primary cursor-pointer px-3 py-1.5 rounded-xl border border-primary/40 hover:bg-primary/5 transition-colors",
                  uploadingFacePhoto && "opacity-50 pointer-events-none"
                )}>
                  {uploadingFacePhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  {uploadingFacePhoto ? "Enviando..." : "Foto de rosto"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFacePhotoUpload} capture="user" />
                </label>
              </div>

              {/* Foto corpo inteiro */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-full aspect-square rounded-2xl bg-muted overflow-hidden border-2 border-border flex items-center justify-center">
                  {form.photo_body_url
                    ? <img src={form.photo_body_url} alt="corpo" className="w-full h-full object-cover" />
                    : <User className="w-10 h-10 text-muted-foreground" />}
                </div>
                <label className={cn(
                  "flex items-center gap-1.5 text-xs font-medium text-primary cursor-pointer px-3 py-1.5 rounded-xl border border-primary/40 hover:bg-primary/5 transition-colors",
                  uploadingBodyPhoto && "opacity-50 pointer-events-none"
                )}>
                  {uploadingBodyPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  {uploadingBodyPhoto ? "Enviando..." : "Corpo inteiro"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleBodyPhotoUpload} capture="environment" />
                </label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">As fotos ajudam o cliente a identificar o prestador na chegada</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Seu nome completo" className="rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp / Telefone *</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999" className="rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="seu@email.com" className="rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>Data de nascimento *</Label>
              <Input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} className="rounded-2xl" />
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Endereço e Documentos ── */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Endereço e Documentos</h2>
            <p className="text-muted-foreground text-sm">Informações de localização e documentação pessoal</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>CEP *</Label>
              <Input value={form.zip_code} onChange={e => set('zip_code', e.target.value)} placeholder="00000-000" className="rounded-2xl" maxLength={9} />
            </div>
            <div className="space-y-2">
              <Label>Rua, número *</Label>
              <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rua das Flores, 123" className="rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} placeholder="Bairro" className="rounded-2xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cidade *</Label>
                <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Cidade" className="rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label>Estado *</Label>
                <Input value={form.state} onChange={e => set('state', e.target.value)} placeholder="UF" className="rounded-2xl" maxLength={2} />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>CPF *</Label>
                <Input value={form.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" className="rounded-2xl" maxLength={14} />
              </div>
              <div className="space-y-2">
                <Label>RG / Identidade *</Label>
                <Input value={form.rg} onChange={e => set('rg', e.target.value)} placeholder="Número do RG" className="rounded-2xl" />
              </div>
            </div>
            <div className="bg-muted/60 rounded-2xl p-4 mt-4">
              <p className="text-xs text-muted-foreground">
                🔒 Seus documentos são usados apenas para verificação de identidade e não serão compartilhados com terceiros.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: Habilidades ── */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Habilidades</h2>
            <p className="text-muted-foreground text-sm">Selecione tudo que você sabe fazer</p>
          </div>

          <div className="space-y-2">
            <Label>Especialidades * (selecione uma ou mais)</Label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map(s => (
                <button
                  key={s.label}
                  onClick={() => toggleSpecialty(s.label)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all",
                    form.specialties.includes(s.label)
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  <span>{s.icon}</span> {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Anos de experiência *</Label>
            <Input
              type="number"
              value={form.experience_years}
              onChange={e => set('experience_years', e.target.value)}
              placeholder="Ex: 5"
              className="rounded-2xl"
              min={0}
            />
          </div>

          <div className="space-y-2">
            <Label>Conte sobre você (opcional)</Label>
            <Textarea
              value={form.bio}
              onChange={e => set('bio', e.target.value)}
              placeholder="Descreva sua experiência, ferramentas que usa, diferenciais..."
              className="rounded-2xl min-h-[90px]"
            />
          </div>
        </div>
      )}

      {/* ── STEP 4: Homologação ── */}
      {step === 4 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Teste de Homologação</h2>
            <p className="text-muted-foreground text-sm">Entenda o processo antes de enviar seu cadastro</p>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">Escola Prática</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Após enviar o cadastro, você será convocado para realizar o <strong>teste prático de homologação</strong> presencial na Escola Prática.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { step: "1", title: "Cadastro enviado", desc: "Você preenche este formulário" },
                { step: "2", title: "Análise dos documentos", desc: "Nossa equipe revisa suas informações" },
                { step: "3", title: "Convocação para teste", desc: "Você recebe data e local do teste prático" },
                { step: "4", title: "Aprovação e ativação", desc: "Conta ativada para receber chamados" },
              ].map(item => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Aceite */}
          <button
            onClick={() => set('accepts_homologation', !form.accepts_homologation)}
            className={cn(
              "w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all",
              form.accepts_homologation ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            <div className={cn(
              "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
              form.accepts_homologation ? "bg-primary border-primary" : "border-muted-foreground"
            )}>
              {form.accepts_homologation && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </div>
            <p className="text-sm text-foreground">
              Entendo que precisarei passar pelo <strong>teste de homologação na Escola Prática</strong> e que minha conta só será ativada após aprovação.
            </p>
          </button>
        </div>
      )}

      {/* Botão de ação */}
      <div className="mt-8">
        {step < STEPS.length ? (
          <Button
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext()}
            className="w-full h-14 rounded-2xl font-bold text-base"
          >
            Continuar <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canNext() || createProvider.isPending}
            className="w-full h-14 rounded-2xl font-bold text-base"
          >
            {createProvider.isPending
              ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Enviando...</>
              : "Enviar cadastro para análise ✅"}
          </Button>
        )}
      </div>
    </div>
  );
}