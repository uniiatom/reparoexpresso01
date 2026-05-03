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
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

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

  const handleSubmitClick = () => {
    setShowTermsModal(true);
    setTermsAccepted(false);
  };

  const handleConfirmTerms = () => {
    if (termsAccepted) {
      setShowTermsModal(false);
      createClient.mutate();
    }
  };

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
           onClick={handleSubmitClick}
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

         {/* Modal de aceite de termos */}
         {showTermsModal && (
           <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
             <div className="bg-card w-full max-w-lg rounded-t-3xl p-6 pb-8" onClick={e => e.stopPropagation()}>
               <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

               <h3 className="text-xl font-bold text-foreground mb-4">Aceitar termos</h3>

               <div className="max-h-60 overflow-y-auto mb-6 bg-muted/30 rounded-2xl p-4 text-sm text-foreground/80 space-y-3">
                 <p><strong>Termos de Uso - Cliente</strong></p>
                 <p>Ao criar sua conta no Reparo Expresso, você concorda com os seguintes termos e condições:</p>

                 <div>
                   <p className="font-semibold">1. Uso da Plataforma</p>
                   <p>Você é responsável por manter a confidencialidade de sua conta e senha. Concorda em usar a plataforma apenas para fins legítimos e não para atividades ilegais ou prejudiciais.</p>
                 </div>

                 <div>
                   <p className="font-semibold">2. Dados Pessoais</p>
                   <p>Seus dados serão utilizados apenas para prover serviços de reparo e não serão compartilhados com terceiros sem consentimento.</p>
                 </div>

                 <div>
                   <p className="font-semibold">3. Política de Pagamento</p>
                   <p>O pagamento pelos serviços pode ser realizado via PIX ou cartão de crédito. Os valores são estabelecidos pelos prestadores de serviço.</p>
                 </div>

                 <div>
                   <p className="font-semibold">4. Cancelamento</p>
                   <p>Você pode cancelar uma solicitação de serviço antes que o prestador chegue. Após isso, o serviço está confirmado.</p>
                 </div>

                 <div>
                   <p className="font-semibold">5. Avaliação</p>
                   <p>Solicitamos que avalie o prestador após o término do serviço para melhorar a qualidade da plataforma.</p>
                 </div>

                 <div>
                   <p className="font-semibold">6. Responsabilidade</p>
                   <p>A plataforma não é responsável por danos causados pelos prestadores de serviço. Recomendamos verificar referências e avaliações antes de confirmar.</p>
                 </div>
               </div>

               <div className="flex items-start gap-3 mb-6 p-4 bg-primary/5 rounded-2xl border border-primary/20">
                 <input
                   type="checkbox"
                   checked={termsAccepted}
                   onChange={(e) => setTermsAccepted(e.target.checked)}
                   className="w-5 h-5 rounded border-border mt-0.5 cursor-pointer accent-primary"
                 />
                 <label className="text-sm text-foreground cursor-pointer flex-1">
                   Li e aceito os termos de uso e política de privacidade
                 </label>
               </div>

               <div className="flex gap-3">
                 <Button
                   variant="outline"
                   className="flex-1 rounded-xl"
                   onClick={() => setShowTermsModal(false)}
                 >
                   Cancelar
                 </Button>
                 <Button
                   className="flex-1 rounded-xl"
                   onClick={handleConfirmTerms}
                   disabled={!termsAccepted}
                 >
                   Aceitar e Continuar
                 </Button>
               </div>
             </div>
           </div>
         )}
      </div>
    </div>
  );
}