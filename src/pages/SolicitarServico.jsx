import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, MapPin, Zap, Droplets, Paintbrush, Wrench,
  Settings, Hammer, Lock, Wind, ChevronRight, Calendar,
  Clock, Camera, X, Navigation, Loader2, Car
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGeolocation } from "@/hooks/useGeolocation";
import ProviderSearchModal from "@/components/ProviderSearchModal";

const SERVICE_TYPES = [
  { value: "eletrica", label: "Elétrica", icon: Zap, group: "casa" },
  { value: "hidraulica", label: "Hidráulica", icon: Droplets, group: "casa" },
  { value: "pintura", label: "Pintura", icon: Paintbrush, group: "casa" },
  { value: "reparo_geral", label: "Reparo Geral", icon: Wrench, group: "casa" },
  { value: "montagem", label: "Montagem", icon: Settings, group: "casa" },
  { value: "alvenaria", label: "Alvenaria", icon: Hammer, group: "casa" },
  { value: "fechadura", label: "Fechadura", icon: Lock, group: "casa" },
  { value: "ar_condicionado", label: "Ar Condicionado", icon: Wind, group: "casa" },
  { value: "limpeza_caixa_dagua", label: "Limpeza Caixa d'Água", icon: Droplets, group: "casa" },
  { value: "limpeza_calha", label: "Limpeza de Calha", icon: Wrench, group: "casa" },
  { value: "substituicao_telha", label: "Substituição de Telha", icon: Hammer, group: "casa" },
  { value: "limpeza_telhado", label: "Limpeza de Telhado", icon: Wrench, group: "casa" },
  { value: "instalacao_coifa_parede", label: "Coifa de Parede", icon: Wind, group: "casa" },
  { value: "instalacao_coifa_ilha", label: "Coifa Ilha", icon: Wind, group: "casa" },
  { value: "conversao_vaso_coplado", label: "Conversão Vaso CX Acoplada", icon: Droplets, group: "casa" },
  { value: "instalacao_vaso_monobloco", label: "Vaso Monobloco", icon: Droplets, group: "casa" },
  { value: "reparo_forro_gesso", label: "Reparo Forro de Gesso", icon: Hammer, group: "casa" },
  { value: "outros", label: "Outros", icon: Wrench, group: "casa" },
  { value: "troca_pneu", label: "Troca de Pneu", icon: Car, group: "veiculo" },
  { value: "recarga_bateria", label: "Recarga de Bateria", icon: Zap, group: "veiculo" },
  { value: "conserto_pneu", label: "Conserto de Pneu", icon: Car, group: "veiculo" },
  { value: "reboque", label: "Reboque", icon: Car, group: "veiculo" },
  ];

const URGENCY = [
  { value: "agora", label: "Agora", desc: "Preciso urgente" },
  { value: "hoje", label: "Hoje", desc: "No mesmo dia" },
  { value: "esta_semana", label: "Esta semana", desc: "Sem pressa" },
];

const TIME_SLOTS = [
  "07:00","08:00","09:00","10:00","11:00",
  "13:00","14:00","15:00","16:00","17:00","18:00",
];

export default function SolicitarServico() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const [step, setStep] = useState(1);
  const [serviceTab, setServiceTab] = useState(urlParams.get('tipo') && ['troca_pneu','recarga_bateria','conserto_pneu','veiculo_outros'].includes(urlParams.get('tipo')) ? 'veiculo' : 'casa');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [showProviderSearch, setShowProviderSearch] = useState(false);
  const { location, loading: geoLoading, error: geoError, getLocation } = useGeolocation();

  const [form, setForm] = useState({
    service_type: urlParams.get('tipo') || '',
    description: '',
    client_suggested_price: '',
    problem_photos: [],
    address: '',
    city: '',
    state: '',
    latitude: null,
    longitude: null,
    modality: 'imediato',
    urgency: 'agora',
    scheduled_date: '',
    scheduled_time: '',
    client_name: '',
    client_phone: '',
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingPhotos(true);
    const urls = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url)));
    setForm(prev => ({ ...prev, problem_photos: [...prev.problem_photos, ...urls] }));
    setUploadingPhotos(false);
  };

  const removePhoto = (idx) => {
    setForm(prev => ({ ...prev, problem_photos: prev.problem_photos.filter((_, i) => i !== idx) }));
  };

  const applyGeolocation = () => {
    if (location) {
      setForm(prev => ({
        ...prev,
        address: location.address || prev.address,
        city: location.city || prev.city,
        state: location.state || prev.state,
        latitude: location.latitude,
        longitude: location.longitude,
      }));
    }
  };

  React.useEffect(() => {
    if (location) applyGeolocation();
  }, [location]);

  const createRequest = useMutation({
    mutationFn: (data) => base44.entities.ServiceRequest.create({ ...data, status: 'aguardando' }),
    onSuccess: (result) => navigate(`/acompanhar/${result.id}`),
  });

  const handleFinalConfirm = (formData) => {
    setShowProviderSearch(false);
    createRequest.mutate(formData);
  };

  const canNext = () => {
    if (step === 1) return !!form.service_type;
    if (step === 2) return form.description.length > 5;
    if (step === 3) return form.address.length > 3;
    if (step === 4) {
      if (form.modality === 'agendado') return !!form.scheduled_date && !!form.scheduled_time;
      return true;
    }
    if (step === 5) return form.client_name.length > 2 && form.client_phone.length > 7;
    return true;
  };

  const totalSteps = 5;

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 py-6">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/')} className="p-2 hover:bg-accent rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">Passo {step} de {totalSteps}</p>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${(step / totalSteps) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Step 1: Tipo de serviço */}
      {step === 1 && (
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">Qual serviço?</h2>
          <p className="text-muted-foreground mb-4">Selecione o tipo de serviço que precisa</p>
          <div className="flex gap-2 mb-5">
            <button onClick={() => setServiceTab('casa')}
              className={cn("flex-1 py-2 rounded-xl text-sm font-semibold transition-all",
                serviceTab === 'casa' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              🏠 Casa
            </button>
            <button onClick={() => setServiceTab('veiculo')}
              className={cn("flex-1 py-2 rounded-xl text-sm font-semibold transition-all",
                serviceTab === 'veiculo' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              🚗 Veículo
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {SERVICE_TYPES.filter(s => s.group === serviceTab).map(s => {
              const Icon = s.icon;
              const selected = form.service_type === s.value;
              return (
                <button key={s.value} onClick={() => set('service_type', s.value)}
                  className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                    selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}>
                  <Icon className={cn("w-7 h-7", selected ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-medium text-center", selected ? "text-primary" : "text-foreground")}>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Descrição + Fotos */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Descreva o problema</h2>
            <p className="text-muted-foreground mb-4">Quanto mais detalhes, melhor</p>
          </div>
          <div className="space-y-2">
            <Label>O que está acontecendo?</Label>
            <Textarea
              placeholder="Ex: Tomada não funciona no quarto, chuveiro vazando..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className="min-h-[110px] rounded-2xl"
            />
          </div>

          {/* Sugestão de valor */}
           <div className="space-y-2">
             <Label>Qual valor você sugere? (opcional)</Label>
             <div className="relative">
               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
               <Input
                 placeholder="Ex: 150,00"
                 value={form.client_suggested_price}
                 onChange={e => set('client_suggested_price', e.target.value)}
                 className="pl-10 rounded-2xl"
                 type="number"
                 step="0.01"
                 min="0"
               />
             </div>
             <p className="text-xs text-muted-foreground">Isso ajuda os prestadores a estimarem melhor o orçamento</p>
           </div>

          {/* Fotos do problema */}
           <div className="space-y-2">
             <Label className="flex items-center gap-2"><Camera className="w-4 h-4" /> Fotos do problema (opcional)</Label>
            <div className="flex flex-wrap gap-2">
              {form.problem_photos.map((url, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removePhoto(idx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {form.problem_photos.length < 4 && (
                <label className={cn(
                  "w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors",
                  uploadingPhotos && "opacity-50 pointer-events-none"
                )}>
                  {uploadingPhotos ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /> : <Camera className="w-6 h-6 text-muted-foreground" />}
                  <span className="text-xs text-muted-foreground mt-1">{uploadingPhotos ? "..." : "Adicionar"}</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} capture="environment" />
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Tire fotos diretamente com a câmera ou escolha da galeria (máx. 4)</p>
          </div>
        </div>
      )}

      {/* Step 3: Localização */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Onde é o serviço?</h2>
            <p className="text-muted-foreground mb-4">Use sua localização atual ou informe o endereço</p>
          </div>

          {/* Botão de geolocalização */}
          <button
            onClick={getLocation}
            disabled={geoLoading}
            className={cn(
              "w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left",
              form.latitude ? "border-primary bg-primary/5" : "border-dashed border-border hover:border-primary/50"
            )}
          >
            {geoLoading ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
            ) : (
              <Navigation className={cn("w-5 h-5 flex-shrink-0", form.latitude ? "text-primary" : "text-muted-foreground")} />
            )}
            <div>
              <p className={cn("font-semibold text-sm", form.latitude ? "text-primary" : "text-foreground")}>
                {geoLoading ? "Obtendo localização..." : form.latitude ? "Localização obtida ✓" : "Usar minha localização atual"}
              </p>
              {form.latitude && location && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{location.full?.split(',').slice(0, 3).join(',')}</p>
              )}
              {geoError && <p className="text-xs text-destructive mt-0.5">{geoError}</p>}
            </div>
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou digite o endereço</span>
            <div className="h-px flex-1 bg-border" />
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input placeholder="Cidade" value={form.city} onChange={e => set('city', e.target.value)} className="rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input placeholder="UF" value={form.state} onChange={e => set('state', e.target.value)} className="rounded-2xl" maxLength={2} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Quando */}
      {step === 4 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Quando?</h2>
            <p className="text-muted-foreground mb-4">Atendimento imediato ou agendado?</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "imediato", label: "Imediato", desc: "Prestador chega o quanto antes", icon: Zap },
              { value: "agendado", label: "Agendado", desc: "Escolha data e horário", icon: Calendar },
            ].map(m => (
              <button key={m.value} onClick={() => set('modality', m.value)}
                className={cn("flex flex-col items-start gap-2 p-4 rounded-2xl border-2 transition-all text-left",
                  form.modality === m.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}>
                <m.icon className={cn("w-6 h-6", form.modality === m.value ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <p className={cn("font-semibold text-sm", form.modality === m.value ? "text-primary" : "text-foreground")}>{m.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {form.modality === 'imediato' && (
            <div className="space-y-2">
              <Label>Urgência</Label>
              <div className="grid grid-cols-3 gap-2">
                {URGENCY.map(u => (
                  <button key={u.value} onClick={() => set('urgency', u.value)}
                    className={cn("p-3 rounded-2xl border-2 text-left transition-all",
                      form.urgency === u.value ? "border-primary bg-primary/5" : "border-border")}>
                    <p className={cn("font-semibold text-sm", form.urgency === u.value ? "text-primary" : "text-foreground")}>{u.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{u.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.modality === 'agendado' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Data</Label>
                <Input type="date" value={form.scheduled_date} min={new Date().toISOString().split('T')[0]}
                  onChange={e => set('scheduled_date', e.target.value)} className="rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Clock className="w-4 h-4" /> Horário</Label>
                <div className="flex flex-wrap gap-2">
                  {TIME_SLOTS.map(t => (
                    <button key={t} onClick={() => set('scheduled_time', t)}
                      className={cn("px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition-all",
                        form.scheduled_time === t ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground")}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 5: Dados pessoais */}
      {step === 5 && (
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
          {/* Resumo */}
          <div className="bg-primary/5 rounded-2xl p-4 border border-primary/20 space-y-1">
            <p className="text-sm font-semibold text-foreground mb-2">Resumo do pedido</p>
            <p className="text-sm text-muted-foreground">🔧 {SERVICE_TYPES.find(s => s.value === form.service_type)?.label}</p>
            <p className="text-sm text-muted-foreground">📍 {form.address}{form.city ? `, ${form.city}` : ''}</p>
            {form.latitude && <p className="text-sm text-muted-foreground">📡 Localização GPS ativada</p>}
            {form.problem_photos.length > 0 && <p className="text-sm text-muted-foreground">📷 {form.problem_photos.length} foto(s) anexada(s)</p>}
             {form.client_suggested_price && <p className="text-sm text-muted-foreground">💰 Sugestão de valor: R$ {Number(form.client_suggested_price).toFixed(2)}</p>}
             <p className="text-sm text-muted-foreground">
               {form.modality === 'agendado' ? `📅 Agendado: ${form.scheduled_date} às ${form.scheduled_time}` : `⚡ ${URGENCY.find(u => u.value === form.urgency)?.label}`}
             </p>
          </div>
        </div>
      )}

      <div className="mt-8">
        {step < totalSteps ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
            className="w-full h-14 rounded-2xl font-bold text-base bg-primary text-primary-foreground">
            Continuar <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        ) : (
          <Button onClick={() => setShowProviderSearch(true)} disabled={!canNext() || createRequest.isPending}
            className="w-full h-14 rounded-2xl font-bold text-base bg-primary text-primary-foreground">
            {createRequest.isPending
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : "Buscar prestador 🔧"}
          </Button>
        )}
      </div>

      {showProviderSearch && (
        <ProviderSearchModal
          form={form}
          onConfirm={handleFinalConfirm}
          onSchedule={handleFinalConfirm}
          onClose={() => setShowProviderSearch(false)}
        />
      )}
    </div>
  );
}