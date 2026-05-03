import React, { useState, useEffect, useRef } from 'react';
import BusyAlertClientView from "@/components/BusyAlertClientView";
import WarrantyBanner from "@/components/WarrantyBanner";
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, MapPin, Zap, Droplets, Paintbrush, Wrench,
  Settings, Hammer, Lock, Wind, ChevronRight, Calendar,
  Clock, Camera, X, Navigation, Loader2, Car, UserPlus, Monitor
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useNearbyProviders } from "@/hooks/useNearbyProviders";
import MapView from "@/components/MapView";
import ProviderSearchModal from "@/components/ProviderSearchModal";
import ClientScheduleSelector from "@/components/ClientScheduleSelector";
import { useScheduleAvailability } from "@/hooks/useScheduleAvailability";
import TowServiceQuestions from "@/components/TowServiceQuestions";

const SERVICE_TYPES = [
  { value: "eletrica", label: "Elétrica", icon: Zap, group: "casa" },
  { value: "hidraulica", label: "Hidráulica", icon: Droplets, group: "casa" },
  { value: "reparo_geral", label: "Reparo Geral", icon: Wrench, group: "casa" },
  { value: "fechadura", label: "Fechadura", icon: Lock, group: "casa" },
  { value: "ar_condicionado", label: "Ar Condicionado", icon: Wind, group: "casa" },
  { value: "limpeza_caixa_dagua", label: "Limpeza Caixa d'Água", icon: Droplets, group: "casa" },
  { value: "limpeza_calha", label: "Limpeza de Calha", icon: Wrench, group: "casa" },
  { value: "substituicao_telha", label: "Substituição de Telha", icon: Hammer, group: "casa" },
  { value: "limpeza_telhado", label: "Limpeza de Telhado", icon: Wrench, group: "casa" },
  { value: "instalacao_coifa_parede", label: "Coifa de Parede", icon: Wind, group: "casa" },
  { value: "conversao_vaso_coplado", label: "Conversão Vaso CX Acoplada", icon: Droplets, group: "casa" },
  { value: "reparo_forro_gesso", label: "Reparo Forro de Gesso", icon: Hammer, group: "casa" },
  { value: "desentupimento", label: "Desentupimento", icon: Droplets, group: "casa" },
  { value: "instalacao_suporte_tv", label: "Suporte de TV", icon: Monitor, group: "casa", needsTvSize: true },
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

// Horários de 1 em 1h — das 07:00 às 17:00
const HOUR_SLOTS = Array.from({ length: 11 }, (_, i) => {
  const hour = 7 + i;
  return `${String(hour).padStart(2, '0')}:00`;
});

export default function SolicitarServico() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => { setCurrentUser(u); setUserLoaded(true); }).catch(() => setUserLoaded(true));
  }, []);

  const { data: clientProfile, isLoading: clientLoading } = useQuery({
    queryKey: ['client-profile', currentUser?.id],
    queryFn: () => base44.entities.Client.filter({ user_id: currentUser.id }),
    enabled: !!currentUser?.id,
    select: (data) => data[0] || null,
  });

  // Serviços concluídos dentro da janela de garantia (90 dias)
  const { data: warrantyServices = [] } = useQuery({
    queryKey: ['warranty-services', currentUser?.email],
    queryFn: async () => {
      const all = await base44.entities.ServiceRequest.filter({
        created_by: currentUser.email,
        status: 'concluido',
      }, '-updated_date', 100);
      const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
      return all.filter(r => {
        const d = new Date(r.updated_date || r.created_date).getTime();
        return d >= cutoff;
      });
    },
    enabled: !!currentUser?.email,
  });
  const [step, setStep] = useState(-1);

  // Define step inicial após carregar dados do cliente
  useEffect(() => {
    if (userLoaded && !clientLoading && step === -1) {
      setStep(clientProfile ? 1 : 0);
    }
  }, [userLoaded, clientLoading, clientProfile, step]); // -1 = ainda determinando
  const [serviceTab, setServiceTab] = useState(urlParams.get('tipo') && ['troca_pneu','recarga_bateria','conserto_pneu','veiculo_outros'].includes(urlParams.get('tipo')) ? 'veiculo' : 'casa');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [showProviderSearch, setShowProviderSearch] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [activeBusyAlertId, setActiveBusyAlertId] = useState(null);
  const [showCaixaDaguaModal, setShowCaixaDaguaModal] = useState(false);
  const [caixaDaguaTipo, setCaixaDaguaTipo] = useState(null); // 'residencia' | 'condominio'
  const [caixaDaguaLitragem, setCaixaDaguaLitragem] = useState(null);
  const [caixaDaguaStep, setCaixaDaguaStep] = useState('tipo'); // 'tipo' | 'litragem'
  const [showTvSizeModal, setShowTvSizeModal] = useState(false);
  const [tvSize, setTvSize] = useState(null); // 'ate55' | 'acima55'
  const [showDesentupimentoModal, setShowDesentupimentoModal] = useState(false);
  const [desentupimentoTipo, setDesentupimentoTipo] = useState(null);
  const [showMolaAlert, setShowMolaAlert] = useState(null); // nome do tipo que tem taxa de mola
  const [showNaoSeiAlert, setShowNaoSeiAlert] = useState(false);
  const [showForroGessoModal, setShowForroGessoModal] = useState(false);
  const [forroGessoTipo, setForroGessoTipo] = useState(null);
  const [towQuestions, setTowQuestions] = useState({});
  const [towVehicleType, setTowVehicleType] = useState(null);
  const { location, loading: geoLoading, error: geoError, getLocation } = useGeolocation();
  
  const [sharingLocation, setSharingLocation] = useState(false);
  const [liveWatchId, setLiveWatchId] = useState(null);

  const startLiveLocation = () => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setForm(prev => ({
          ...prev,
          client_latitude: pos.coords.latitude,
          client_longitude: pos.coords.longitude,
        }));
      },
      null,
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    setLiveWatchId(id);
    setSharingLocation(true);
  };

  const stopLiveLocation = () => {
    if (liveWatchId !== null) navigator.geolocation.clearWatch(liveWatchId);
    setLiveWatchId(null);
    setSharingLocation(false);
  };

  React.useEffect(() => () => { if (liveWatchId !== null) navigator.geolocation.clearWatch(liveWatchId); }, [liveWatchId]);

  // descriptions_per_service: { [service_type]: { description, photos } }
  const [descriptionsPerService, setDescriptionsPerService] = useState({});

  const setServiceDesc = (serviceType, field, value) => {
    setDescriptionsPerService(prev => ({
      ...prev,
      [serviceType]: { ...prev[serviceType], [field]: value }
    }));
  };

  const [uploadingPhotosFor, setUploadingPhotosFor] = useState(null);

  const handlePhotoUploadFor = async (e, serviceType) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingPhotosFor(serviceType);
    const urls = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url)));
    setDescriptionsPerService(prev => ({
      ...prev,
      [serviceType]: {
        ...prev[serviceType],
        photos: [...(prev[serviceType]?.photos || []), ...urls]
      }
    }));
    setUploadingPhotosFor(null);
  };

  const removePhotoFor = (serviceType, idx) => {
    setDescriptionsPerService(prev => ({
      ...prev,
      [serviceType]: {
        ...prev[serviceType],
        photos: (prev[serviceType]?.photos || []).filter((_, i) => i !== idx)
      }
    }));
  };

  const [form, setForm] = useState({
   service_type: urlParams.get('tipo') ? [urlParams.get('tipo')] : [],
   description: '',
   client_suggested_price: '',
   problem_photos: [],
   address: '',
   number: '',
   neighborhood: '',
   city: '',
   state: '',
   cep: '',
   latitude: null,
   longitude: null,
   client_latitude: null,
   client_longitude: null,
   delivery_address: '',
   delivery_number: '',
   delivery_neighborhood: '',
   delivery_city: '',
   delivery_state: '',
   delivery_cep: '',
   delivery_latitude: null,
   delivery_longitude: null,
   tow_distance_km: null,
   modality: 'imediato',
   urgency: 'agora',
   scheduled_date: '',
   scheduled_time: '',
   client_name: clientProfile?.name || '',
   client_phone: clientProfile?.phone || '',
   referral_code: urlParams.get('ref') || '',
  });

  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState('');

  const geocodeAddress = async (street, number, neighborhood, city, state, isDelivery = false) => {
    const query = [street, number, neighborhood, city, state, 'Brasil'].filter(Boolean).join(', ');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=br`, {
        headers: { 'Accept-Language': 'pt-BR' }
      });
      const data = await res.json();
      if (data?.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (isDelivery) {
          setForm(prev => ({ ...prev, delivery_latitude: lat, delivery_longitude: lon }));
        } else {
          setForm(prev => ({ ...prev, latitude: lat, longitude: lon }));
        }
      }
    } catch (e) {
      console.warn('Geocode error:', e);
    }
  };

  const searchByCep = async (cep, isDelivery = false) => {
   const cleanCep = cep.replace(/\D/g, '');
   if (cleanCep.length !== 8) return;

   setLoadingCep(true);
   setCepError('');
   try {
     const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
     const data = await res.json();

     if (data.erro) {
       setCepError('CEP não encontrado');
       setLoadingCep(false);
       return;
     }

     if (isDelivery) {
       setForm(prev => ({
         ...prev,
         delivery_address: data.logradouro || '',
         delivery_city: data.localidade || '',
         delivery_state: data.uf || '',
         delivery_neighborhood: data.bairro || '',
         delivery_cep: cleanCep,
       }));
       // Geocodifica endereço de entrega
       await geocodeAddress(data.logradouro, '', data.bairro, data.localidade, data.uf, true);
     } else {
       setForm(prev => ({
         ...prev,
         address: data.logradouro || '',
         city: data.localidade || '',
         state: data.uf || '',
         neighborhood: data.bairro || '',
         cep: cleanCep,
       }));
       // Geocodifica endereço de saída
       await geocodeAddress(data.logradouro, '', data.bairro, data.localidade, data.uf, false);
     }
   } catch {
     setCepError('Erro ao buscar CEP');
   }
   setLoadingCep(false);
  };

  const { data: nearbyProviders = [] } = useNearbyProviders(location?.latitude, location?.longitude, form.service_type);

  // Para verificar disponibilidade de horários quando agendado (sem provider definido ainda, usa lógica global)
  const [scheduledAvailableSlots, setScheduledAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const fetchAvailableSlotsForDate = async (date) => {
    if (!date) return;
    setLoadingSlots(true);
    setScheduledAvailableSlots([]);
    try {
      // Busca todas as OS agendadas para essa data
      const allServices = await base44.entities.ServiceRequest.filter({ modality: 'agendado' });
      const ACTIVE_STATUSES = ['agendado', 'aceito', 'a_caminho', 'em_andamento'];
      const servicesOnDate = allServices.filter(s =>
        s.scheduled_date === date && ACTIVE_STATUSES.includes(s.status)
      );
      const occupiedSlots = new Set(servicesOnDate.map(s => s.scheduled_time));
      const available = HOUR_SLOTS.filter(slot => !occupiedSlots.has(slot));
      setScheduledAvailableSlots(available);
    } catch {
      setScheduledAvailableSlots(HOUR_SLOTS);
    }
    setLoadingSlots(false);
  };

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const calcDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const isTow = form.service_type.includes('reboque');

  // Preços base de reboque por tipo de veículo (em R$)
  const towPricingTable = {
    moto: { base: 150, perKm: 3.50 },
    carro: { base: 180, perKm: 5.00 },
    suv: { base: 220, perKm: 6.00 },
    van: { base: 250, perKm: 7.00 },
  };

  // Calcula preço estimado para reboque
  const calculateTowPrice = () => {
    if (!isTow || !towVehicleType || !form.tow_distance_km) return null;
    const pricing = towPricingTable[towVehicleType];
    if (!pricing) return null;
    
    const distanceCharge = form.tow_distance_km * pricing.perKm;
    const total = pricing.base + distanceCharge;
    
    return {
      base: pricing.base,
      distanceCharge,
      total,
      distance: form.tow_distance_km,
      perKm: pricing.perKm,
    };
  };

  const towPrice = calculateTowPrice();

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

  // Verifica se todas as descrições por serviço estão preenchidas (quando múltiplos serviços)
  // E se há pelo menos 2 fotos (próxima e ampla)
  const allDescriptionsFilled = () => {
    const hasMinPhotos = form.service_type.length <= 1
      ? form.problem_photos.length >= 2
      : form.service_type.every(t => (descriptionsPerService[t]?.photos || []).length >= 2);
    
    const hasDescriptions = form.service_type.length <= 1
      ? form.description.length > 5
      : form.service_type.every(t => (descriptionsPerService[t]?.description || '').length > 5);
    
    return hasDescriptions && hasMinPhotos;
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

  const [registerForm, setRegisterForm] = useState({
    name: currentUser?.full_name || '',
    phone: '',
  });

  const createClientMutation = useMutation({
    mutationFn: () => base44.entities.Client.create({
      name: registerForm.name,
      phone: registerForm.phone,
      user_id: currentUser?.id || '',
    }),
    onSuccess: (newClient) => {
      // preenche dados do form com o que foi cadastrado
      setForm(prev => ({ ...prev, client_name: registerForm.name, client_phone: registerForm.phone }));
      setStep(1);
    },
  });

  const createRequestRef = useRef(false);

  const createRequest = useMutation({
    mutationFn: async (formData) => {
      const { _secondProvider, requires_two_providers, tv_size, _caixaCondominio, ...cleanData } = formData;
      const serviceTypes = Array.isArray(cleanData.service_type) && cleanData.service_type.length > 0
        ? cleanData.service_type
        : [cleanData.service_type];

      const baseData = {
        ...cleanData,
        client_suggested_price: cleanData.client_suggested_price ? Number(cleanData.client_suggested_price) : null,
        status: 'aguardando',
        estimated_arrival_minutes: cleanData.estimated_arrival_minutes ?? null,
      };

      if (isTow && form.latitude && form.delivery_latitude) {
        baseData.tow_distance_km = calcDistance(form.latitude, form.longitude, form.delivery_latitude, form.delivery_longitude) * 2;
      }

      const results = await Promise.all(
        serviceTypes.map(type => {
          // Para caixa d'água, sempre usa descriptionsPerService pois a descrição é preenchida automaticamente
          const hasPerService = descriptionsPerService[type]?.description;
          const description = hasPerService ? descriptionsPerService[type].description : baseData.description;
          const problem_photos = hasPerService ? (descriptionsPerService[type]?.photos || []) : baseData.problem_photos;

          // Para TV acima de 55", adiciona info no description e cria OS para o 2º prestador também
          const isTvLarge = type === 'instalacao_suporte_tv' && tv_size === 'acima55';
          const finalDescription = isTvLarge
            ? `[TV acima de 55"] ${description}`
            : type === 'instalacao_suporte_tv' && tv_size === 'ate55'
            ? `[TV até 55"] ${description}`
            : description;

          return base44.entities.ServiceRequest.create({ ...baseData, service_type: type, description: finalDescription, problem_photos });
        })
      );

      // Função auxiliar: gera senhas para uma OS via backend (fallback caso a automação falhe)
      const ensurePasswords = async (requestId) => {
        try {
          await base44.functions.invoke('generateServicePasswords', { request_id: requestId });
        } catch (e) {
          // Silencia — a automação onServiceCreated já deve ter gerado
        }
      };

      // Se caixa d'água de condomínio e tem segundo prestador, cria OS adicional para ele
      if (_caixaCondominio && _secondProvider && serviceTypes.includes('limpeza_caixa_dagua')) {
        const descCondominio = descriptionsPerService['limpeza_caixa_dagua']?.description || baseData.description;
        const photosCondominio = descriptionsPerService['limpeza_caixa_dagua']?.photos || baseData.problem_photos;
        const secondOS = await base44.entities.ServiceRequest.create({
          ...baseData,
          service_type: 'limpeza_caixa_dagua',
          description: `[Prestador 2] ${descCondominio}`,
          problem_photos: photosCondominio,
        });
        // Aguarda 3s para a automação processar; se senha ainda não foi gerada, força geração
        setTimeout(() => ensurePasswords(secondOS.id), 3000);
      }

      // Se TV acima de 55" e tem segundo prestador, cria OS adicional para ele
      if (tv_size === 'acima55' && _secondProvider && serviceTypes.includes('instalacao_suporte_tv')) {
        const firstResult = results.find((_, i) => serviceTypes[i] === 'instalacao_suporte_tv');
        if (firstResult) {
          const hasPerService = serviceTypes.length > 1 && descriptionsPerService['instalacao_suporte_tv'];
          const description = hasPerService ? (descriptionsPerService['instalacao_suporte_tv']?.description || '') : baseData.description;
          const problem_photos = hasPerService ? (descriptionsPerService['instalacao_suporte_tv']?.photos || []) : baseData.problem_photos;
          const secondOS = await base44.entities.ServiceRequest.create({
            ...baseData,
            service_type: 'instalacao_suporte_tv',
            description: `[TV acima de 55" - Prestador 2] ${description}`,
            problem_photos,
          });
          // Aguarda 3s para a automação processar; se senha ainda não foi gerada, força geração
          setTimeout(() => ensurePasswords(secondOS.id), 3000);
        }
      }

      // Fallback: garante senhas para todas as OSs principais após 3s
      results.forEach(r => {
        setTimeout(async () => {
          try {
            const current = await base44.entities.ServiceRequest.filter({ id: r.id });
            if (current[0] && !current[0].security_password) {
              await base44.functions.invoke('generateServicePasswords', { request_id: r.id });
            }
          } catch (e) { /* silencia */ }
        }, 3000);
      });

      return results[0];
    },
    onSuccess: (result) => navigate(`/acompanhar/${result.id}`),
  });

  const handleFinalConfirm = (formData) => {
    if (createRequestRef.current) return;
    createRequestRef.current = true;
    setShowProviderSearch(false);
    const { _secondProvider, ...cleanFormData } = formData;
    createRequest.mutate({ ...cleanFormData, _secondProvider, _caixaCondominio: caixaDaguaTipo === 'condominio' });
  };

  const canNext = () => {
    if (step === 0) return registerForm.name.length > 2 && registerForm.phone.length > 7;
    if (step === 1) return form.service_type.length > 0;
    if (step === 2) {
      // Se é reboque, valida perguntas e tipo de veículo
      if (isTow) {
        const allAnswered = Object.keys(towQuestions).length === 5;
        const hasVictims = towQuestions.has_victims === true;
        const hasVehicleType = !!towVehicleType;
        if (!allAnswered || hasVictims || !hasVehicleType) return false;
      }
      return allDescriptionsFilled();
    }
    if (step === 3) {
      const hasDelivery = !isTow || (form.delivery_address.length > 3 && form.delivery_latitude && form.delivery_longitude);
      const hasDistance = !isTow || (form.latitude && form.longitude && form.delivery_latitude && form.delivery_longitude); // Reboque precisa ter distância calculável
      return form.address.length > 3 && hasDelivery && hasDistance;
    }
    if (step === 4) {
      if (form.modality === 'agendado') return !!form.scheduled_date && !!form.scheduled_time;
      return true;
    }
    if (step === 5) return form.client_name.length > 2 && form.client_phone.length > 7;
    return true;
  };

  // Se não tem perfil, começa no step 0 (cadastro rápido)
  const needsRegister = userLoaded && !clientProfile;
  const totalSteps = needsRegister ? 7 : 6;
  const displayStep = needsRegister ? step + 1 : step + 1; // step 0 = passo 1 para o usuário

  // Aguarda carregar dados do usuário e perfil de cliente, ou determinar step inicial
  if (!userLoaded || clientLoading || step === -1) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto px-4 py-6">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => step > (needsRegister ? 0 : 1) ? setStep(s => s - 1) : navigate('/')} className="p-2 hover:bg-accent rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">Passo {step + (needsRegister ? 1 : 0)} de {totalSteps}</p>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${((step + (needsRegister ? 1 : 0)) / totalSteps) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Step 0: Cadastro rápido (apenas quando não tem perfil) */}
      {step === 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Seus dados</h2>
              <p className="text-muted-foreground text-sm">Rápido! Só para entrar em contato</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Nome completo *</label>
              <input
                type="text"
                placeholder="Como você se chama?"
                value={registerForm.name}
                onChange={e => setRegisterForm(p => ({ ...p, name: e.target.value }))}
                className="w-full h-12 px-4 rounded-2xl border border-input bg-transparent text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">WhatsApp / Telefone *</label>
              <input
                type="tel"
                placeholder="(11) 99999-9999"
                value={registerForm.phone}
                onChange={e => setRegisterForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full h-12 px-4 rounded-2xl border border-input bg-transparent text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div className="bg-muted/50 rounded-2xl p-4 text-xs text-muted-foreground">
            Seus dados ficam salvos para facilitar os próximos pedidos.
          </div>
        </div>
      )}

      {/* Step 1: Tipo de serviço */}
      {step === 1 && (
        <div>
          <WarrantyBanner warrantyServices={warrantyServices} />
          <h2 className="text-2xl font-bold text-foreground mb-1">Qual serviço?</h2>
          <p className="text-muted-foreground mb-4">Selecione um ou mais serviços — cada um gera uma OS com senha própria</p>
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
              const selected = form.service_type.includes(s.value);
              return (
                <button key={s.value} onClick={() => {
                  if (s.value === 'instalacao_suporte_tv' && !selected) {
                    setShowTvSizeModal(true);
                    return;
                  }
                  if (s.value === 'instalacao_suporte_tv' && selected) {
                    setTvSize(null);
                  }
                  if (s.value === 'reparo_forro_gesso' && !selected) {
                    setShowForroGessoModal(true);
                    return;
                  }
                  if (s.value === 'reparo_forro_gesso' && selected) {
                    setForroGessoTipo(null);
                  }
                  if (s.value === 'desentupimento' && !selected) {
                    setShowDesentupimentoModal(true);
                    return;
                  }
                  if (s.value === 'desentupimento' && selected) {
                    setDesentupimentoTipo(null);
                  }
                  if (s.value === 'limpeza_caixa_dagua' && !selected) {
                    setShowCaixaDaguaModal(true);
                    return;
                  }
                  if (s.value === 'limpeza_caixa_dagua' && selected) {
                    setCaixaDaguaTipo(null);
                  }
                  set('service_type', selected
                    ? form.service_type.filter(t => t !== s.value)
                    : [...form.service_type, s.value]
                  );
                }}
                  className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all active:scale-95",
                    selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}>
                  <Icon className={cn("w-7 h-7", selected ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-medium text-center leading-tight", selected ? "text-primary" : "text-foreground")}>
                    {s.value === 'instalacao_suporte_tv' && tvSize ? (
                      <><span>Suporte de TV</span><br /><span className="text-[10px] opacity-75">({tvSize === 'ate55' ? 'até 55"' : 'acima 55"'})</span></>
                    ) : s.value === 'limpeza_caixa_dagua' && caixaDaguaTipo ? (
                      <><span>Caixa d'Água</span><br /><span className="text-[10px] opacity-75">({caixaDaguaTipo === 'residencia' ? 'Residencial' : 'Condomínio'}{caixaDaguaLitragem && caixaDaguaLitragem !== 'Não sei' ? ` · ${caixaDaguaLitragem}` : ''})</span></>
                    ) : s.value === 'reparo_forro_gesso' && forroGessoTipo ? (
                      <><span>Forro de Gesso</span><br /><span className="text-[10px] opacity-75">({forroGessoTipo})</span></>
                    ) : s.value === 'desentupimento' && desentupimentoTipo ? (
                      <><span>Desentupimento</span><br /><span className="text-[10px] opacity-75">({desentupimentoTipo})</span></>
                    ) : s.label}
                  </span>
                  {selected && <span className="w-4 h-4 bg-primary rounded-full flex items-center justify-center"><span className="text-white text-[9px] font-black">✓</span></span>}
                </button>
              );
            })}
          </div>

          {/* Modal tamanho TV */}
          {showTvSizeModal && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowTvSizeModal(false)}>
              <div className="bg-card w-full max-w-lg rounded-t-3xl p-6 pb-8" onClick={e => e.stopPropagation()}>
                <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
                <h3 className="text-lg font-bold text-foreground mb-1 text-center">Instalação de Suporte de TV</h3>
                <p className="text-sm text-muted-foreground text-center mb-5">Qual o tamanho da sua TV?</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'ate55', label: 'Até 55"', emoji: '📺', desc: '1 prestador enviado' },
                    { value: 'acima55', label: 'Acima de 55"', emoji: '🖥️', desc: '2 prestadores enviados' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setTvSize(opt.value);
                        set('service_type', [...form.service_type, 'instalacao_suporte_tv']);
                        setShowTvSizeModal(false);
                      }}
                      className="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-border hover:border-primary/50 transition-all active:scale-95"
                    >
                      <span className="text-3xl">{opt.emoji}</span>
                      <p className="font-bold text-foreground text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Modal subtipo Caixa d'Água */}
          {showCaixaDaguaModal && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => { setShowCaixaDaguaModal(false); setCaixaDaguaStep('tipo'); setCaixaDaguaTipo(null); }}>
              <div className="bg-card w-full max-w-lg rounded-t-3xl p-6 pb-8" onClick={e => e.stopPropagation()}>
                <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

                {/* Step 1: Tipo */}
                {caixaDaguaStep === 'tipo' && (
                  <>
                    <h3 className="text-lg font-bold text-foreground mb-1 text-center">Limpeza de Caixa d'Água</h3>
                    <p className="text-sm text-muted-foreground text-center mb-5">Selecione o tipo do local</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'residencia', label: 'Residencial', emoji: '🏠', desc: 'Casa ou apartamento' },
                        { value: 'condominio', label: 'Condomínio', emoji: '🏢', desc: 'Prédio ou condomínio' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => { setCaixaDaguaTipo(opt.value); setCaixaDaguaStep('litragem'); }}
                          className="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-border hover:border-primary/50 transition-all active:scale-95"
                        >
                          <span className="text-3xl">{opt.emoji}</span>
                          <p className="font-bold text-foreground text-sm">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Step 2: Litragem */}
                {caixaDaguaStep === 'litragem' && (
                  <>
                    <button onClick={() => setCaixaDaguaStep('tipo')} className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                      ← Voltar
                    </button>
                    <h3 className="text-lg font-bold text-foreground mb-1 text-center">Qual a litragem da caixa?</h3>
                    <p className="text-sm text-muted-foreground text-center mb-5">{caixaDaguaTipo === 'residencia' ? 'Residencial' : 'Condomínio'}</p>
                    <div className="grid grid-cols-2 gap-3">
                      {(caixaDaguaTipo === 'residencia'
                        ? [
                            { litro: '500L', preco: 'R$ 150,00' },
                            { litro: '1.000L', preco: 'R$ 200,00' },
                            { litro: '1.500L', preco: 'R$ 250,00' },
                            { litro: '2.000L', preco: 'R$ 300,00' },
                            { litro: '3.000L', preco: 'R$ 380,00' },
                            { litro: 'Não sei', preco: null },
                          ]
                        : [
                            { litro: '10.000L', preco: 'R$ 550,00' },
                            { litro: '15.000L', preco: 'R$ 700,00' },
                            { litro: '20.000L', preco: 'R$ 850,00' },
                            { litro: '30.000L', preco: 'R$ 1.100,00' },
                            { litro: '50.000L', preco: 'R$ 1.600,00' },
                            { litro: '100.000L+', preco: 'R$ 2.500,00' },
                            { litro: 'Não sei', preco: null },
                          ]
                      ).map(opt => {
                        const litro = typeof opt === 'string' ? opt : opt.litro;
                        const preco = typeof opt === 'string' ? null : opt.preco;
                        return (
                        <button
                          key={litro}
                          onClick={() => {
                            if (litro === 'Não sei') {
                              setShowNaoSeiAlert(true);
                              return;
                            }
                            setCaixaDaguaLitragem(litro);
                            const tipoLabel = caixaDaguaTipo === 'residencia' ? 'Residencial' : 'Condomínio';
                            const litDesc = litro === 'Não sei' ? '' : ` — ${litro}`;
                            const precoDesc = preco ? ` (${preco})` : '';
                            const autoDesc = `Limpeza de caixa d'água ${tipoLabel}${litDesc}${precoDesc}.`;
                            const newTypes = [...form.service_type, 'limpeza_caixa_dagua'];
                            set('service_type', newTypes);
                            // Se vai ser o único serviço, preenche description diretamente
                            if (newTypes.length === 1) {
                              set('description', autoDesc);
                            }
                            setDescriptionsPerService(prev => ({
                              ...prev,
                              limpeza_caixa_dagua: {
                                ...prev.limpeza_caixa_dagua,
                                description: autoDesc,
                              }
                            }));
                            setShowCaixaDaguaModal(false);
                            setCaixaDaguaStep('tipo');
                          }}
                          className="flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 border-border hover:border-primary/50 transition-all active:scale-95"
                        >
                          <span className="font-bold text-foreground text-sm">{litro}</span>
                          {preco && <span className="text-xs text-primary font-semibold">{preco}</span>}
                        </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          {/* Modal subtipo Desentupimento */}
          {showDesentupimentoModal && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowDesentupimentoModal(false)}>
              <div className="bg-card w-full max-w-lg rounded-t-3xl p-4 pb-6" onClick={e => e.stopPropagation()}>
                <div className="w-10 h-1 bg-border rounded-full mx-auto mb-3" />
                <h3 className="text-base font-bold text-foreground mb-0.5 text-center">Desentupimento</h3>
                <p className="text-xs text-muted-foreground text-center mb-3">O que precisa ser desentupido?</p>
                <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
                  {[
                    { value: 'Pia de cozinha', emoji: '🍽️', preco: 'R$ 120 – 250' },
                    { value: 'Pia de banheiro', emoji: '🚿', preco: 'R$ 120 – 250' },
                    { value: 'Ralo', emoji: '🌀', preco: 'R$ 100 – 200' },
                    { value: 'Tanque', emoji: '🪣', preco: 'R$ 120 – 250' },
                    { value: 'Vaso sanitário', emoji: '🚽', preco: 'R$ 150 – 300' },
                    { value: 'Caixa de gordura', emoji: '🔧', preco: 'R$ 250 – 500', taxaMola: true },
                    { value: 'Caixa de esgoto', emoji: '🕳️', preco: 'R$ 300 – 600', taxaMola: true },
                    { value: 'Coluna de esgoto', emoji: '🏗️', preco: 'R$ 350 – 700', taxaMola: true },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        if (opt.taxaMola) {
                          setDesentupimentoTipo(opt.value);
                          setShowDesentupimentoModal(false);
                          setShowMolaAlert(opt.value);
                          return;
                        }
                        setDesentupimentoTipo(opt.value);
                        set('service_type', [...form.service_type, 'desentupimento']);
                        setDescriptionsPerService(prev => ({
                          ...prev,
                          desentupimento: {
                            ...prev.desentupimento,
                            description: `Desentupimento de ${opt.value.toLowerCase()}. Valor estimado: ${opt.preco}.`,
                          }
                        }));
                        setShowDesentupimentoModal(false);
                      }}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-border hover:border-primary/50 transition-all active:scale-95"
                    >
                      <span className="text-2xl">{opt.emoji}</span>
                      <p className="font-bold text-foreground text-xs text-center leading-tight">{opt.value}</p>
                      <p className="text-[10px] text-primary font-semibold text-center">{opt.preco}</p>
                      {opt.taxaMola && <p className="text-[10px] text-orange-500 font-semibold text-center">+ R$70/m mola</p>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Modal subtipo Forro de Gesso */}
          {showForroGessoModal && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowForroGessoModal(false)}>
              <div className="bg-card w-full max-w-lg rounded-t-3xl p-4 pb-6" onClick={e => e.stopPropagation()}>
                <div className="w-10 h-1 bg-border rounded-full mx-auto mb-3" />
                <h3 className="text-base font-bold text-foreground mb-0.5 text-center">Reparo Forro de Gesso</h3>
                <p className="text-xs text-muted-foreground text-center mb-3">Qual tipo de reparo é necessário?</p>
                <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
                  {[
                    { value: 'Rachadura', emoji: '🔍', preco: 'R$ 120 – 250' },
                    { value: 'Buraco pequeno', emoji: '🕳️', preco: 'R$ 150 – 300' },
                    { value: 'Buraco grande', emoji: '🔨', preco: 'R$ 300 – 600' },
                    { value: 'Infiltração / mancha', emoji: '💧', preco: 'R$ 200 – 450' },
                    { value: 'Descolamento', emoji: '📋', preco: 'R$ 180 – 400' },
                    { value: 'Troca de placa', emoji: '🔧', preco: 'R$ 250 – 550' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setForroGessoTipo(opt.value);
                        set('service_type', [...form.service_type, 'reparo_forro_gesso']);
                        setDescriptionsPerService(prev => ({
                          ...prev,
                          reparo_forro_gesso: {
                            ...prev.reparo_forro_gesso,
                            description: `Reparo de forro de gesso — ${opt.value.toLowerCase()}. Valor estimado: ${opt.preco}.`,
                          }
                        }));
                        setShowForroGessoModal(false);
                      }}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-border hover:border-primary/50 transition-all active:scale-95"
                    >
                      <span className="text-2xl">{opt.emoji}</span>
                      <p className="font-bold text-foreground text-xs text-center leading-tight">{opt.value}</p>
                      <p className="text-[10px] text-primary font-semibold text-center">{opt.preco}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Modal aviso taxa de mola */}
          {showMolaAlert && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowMolaAlert(null)}>
              <div className="bg-card w-full max-w-lg rounded-t-3xl p-6 pb-8" onClick={e => e.stopPropagation()}>
                <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
                <div className="text-center mb-5">
                  <span className="text-4xl mb-3 block">⚠️</span>
                  <h3 className="text-lg font-bold text-foreground mb-2">{showMolaAlert}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Dependendo da avaliação do técnico no local, poderá ser necessário o uso de mola. Neste caso, será cobrado:
                  </p>
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                    <p className="text-2xl font-black text-orange-600">R$ 70,00 <span className="text-base font-semibold">por metro de mola</span></p>
                    <p className="text-xs text-orange-700 mt-1">Valor adicional à taxa de saída, calculado conforme a metragem necessária</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowMolaAlert(null)}
                    className="flex-1 py-3 rounded-2xl border-2 border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      const tipo = showMolaAlert;
                      setDesentupimentoTipo(tipo);
                      set('service_type', [...form.service_type, 'desentupimento']);
                      setDescriptionsPerService(prev => ({
                        ...prev,
                        desentupimento: {
                          ...prev.desentupimento,
                          description: `Desentupimento de ${tipo.toLowerCase()}. Valor estimado: ${[
                        { value: 'Caixa de gordura', preco: 'R$ 250 – 500' },
                        { value: 'Caixa de esgoto', preco: 'R$ 300 – 600' },
                        { value: 'Coluna de esgoto', preco: 'R$ 350 – 700' },
                      ].find(o => o.value === tipo)?.preco || ''}. Se necessário o uso de mola, será cobrado R$70,00 por metro (avaliado pelo técnico no local).`,
                        }
                      }));
                      setShowMolaAlert(null);
                    }}
                    className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold transition-all"
                  >
                    Entendi, continuar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal aviso "Não sei" litragem */}
          {showNaoSeiAlert && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowNaoSeiAlert(false)}>
              <div className="bg-card w-full max-w-lg rounded-t-3xl p-6 pb-8" onClick={e => e.stopPropagation()}>
                <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
                <div className="text-center mb-5">
                  <span className="text-4xl mb-3 block">📏</span>
                  <h3 className="text-lg font-bold text-foreground mb-2">Litragem não informada</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sem problema! O prestador irá medir e avaliar a capacidade da caixa d'água no local antes de iniciar a limpeza.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-left">
                    <p className="text-sm font-semibold text-blue-900 mb-1">ℹ️ Como funciona:</p>
                    <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                      <li>O técnico mede a litragem da caixa no local</li>
                      <li>Informa o valor correspondente ao cliente</li>
                      <li>A cobrança é confirmada <strong>antes</strong> de iniciar a limpeza</li>
                    </ul>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowNaoSeiAlert(false);
                    setCaixaDaguaLitragem('Não sei');
                    const tipoLabel = caixaDaguaTipo === 'residencia' ? 'Residencial' : 'Condomínio';
                    const autoDesc = `Limpeza de caixa d'água ${tipoLabel} — litragem a ser medida no local pelo prestador.`;
                    const newTypes = [...form.service_type, 'limpeza_caixa_dagua'];
                    set('service_type', newTypes);
                    if (newTypes.length === 1) set('description', autoDesc);
                    setDescriptionsPerService(prev => ({
                      ...prev,
                      limpeza_caixa_dagua: { ...prev.limpeza_caixa_dagua, description: autoDesc }
                    }));
                    setShowCaixaDaguaModal(false);
                    setCaixaDaguaStep('tipo');
                  }}
                  className="w-full py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold transition-all"
                >
                  Entendi, continuar
                </button>
              </div>
            </div>
          )}

          {form.service_type.length > 0 && (
            <div className="mt-4 bg-primary/5 rounded-2xl p-3 border border-primary/20">
              <p className="text-xs font-semibold text-primary mb-1">
                {form.service_type.length} serviço(s) selecionado(s) — cada um gerará uma OS com senha separada
              </p>
              <p className="text-xs text-muted-foreground">
                {form.service_type.map(t => SERVICE_TYPES.find(s => s.value === t)?.label).join(' • ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Perguntas de reboque + Descrição + Fotos */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Se tiver reboque, mostra as perguntas e tipo de veículo */}
          {isTow && (
            <>
              <TowServiceQuestions answers={towQuestions} onChange={setTowQuestions} />
              {towQuestions.has_victims && (
                <div className="bg-red-100 border-l-4 border-red-600 p-4 rounded">
                  <p className="text-red-700 font-bold text-sm">⚠️ Não é possível solicitar reboque com vítimas no local</p>
                  <p className="text-red-600 text-xs mt-1">Aguarde a polícia registrar o ocorrido antes de solicitar o serviço.</p>
                </div>
              )}
              <div className="h-px bg-border" />

              {/* Seleção de tipo de veículo */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Qual o tipo do veículo?</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'moto', label: '🏍️ Moto', desc: 'Motocicleta/scooter' },
                    { value: 'carro', label: '🚗 Carro', desc: 'Sedan/hatch' },
                    { value: 'suv', label: '🚙 SUV', desc: 'SUV/crossover' },
                    { value: 'van', label: '🚐 Van', desc: 'Van/minibus' },
                  ].map(v => (
                    <button
                      key={v.value}
                      onClick={() => setTowVehicleType(v.value)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all text-center",
                        towVehicleType === v.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <span className="text-2xl">{v.label.split(' ')[0]}</span>
                      <span className="text-xs font-semibold text-foreground">{v.label.split(' ').slice(1).join(' ')}</span>
                      <span className="text-[10px] text-muted-foreground">{v.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Previsão de preço */}
              {towVehicleType && form.tow_distance_km && towPrice && (
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-4 border border-primary/20 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">ESTIMATIVA DE PREÇO</p>
                    <div className="text-3xl font-black text-primary">
                      R$ {towPrice.total.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white/50 rounded-xl p-2">
                      <p className="text-muted-foreground font-medium">Taxa base</p>
                      <p className="font-bold text-foreground">R$ {towPrice.base.toFixed(2)}</p>
                    </div>
                    <div className="bg-white/50 rounded-xl p-2">
                      <p className="text-muted-foreground font-medium">Distância</p>
                      <p className="font-bold text-foreground">{towPrice.distance.toFixed(1)} km</p>
                    </div>
                    <div className="col-span-2 bg-white/50 rounded-xl p-2">
                      <p className="text-muted-foreground font-medium">Distância (ida e volta) × R$ {towPrice.perKm.toFixed(2)}/km</p>
                      <p className="font-bold text-foreground">R$ {towPrice.distanceCharge.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground bg-white/50 rounded-xl p-2">
                    <p>⚠️ Preço estimado. O valor final pode variar conforme:</p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      <li>Condições de acesso ao veículo</li>
                      <li>Necessidade de equipamento especial (veículo rebaixado)</li>
                      <li>Roda travada ou danos adicionais</li>
                    </ul>
                  </div>
                </div>
              )}

              {!towVehicleType && (
                <div className="bg-blue-50 rounded-2xl p-3 border border-blue-200">
                  <p className="text-xs text-blue-700">📍 Selecione o tipo de veículo para calcular o preço</p>
                </div>
              )}

              <div className="h-px bg-border" />
            </>
          )}
          
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Descreva o problema</h2>
            <p className="text-muted-foreground mb-4">
              {form.service_type.length > 1
                ? `Preencha a descrição para cada uma das ${form.service_type.length} OS`
                : 'Quanto mais detalhes, melhor'}
            </p>
          </div>

          {form.service_type.length <= 1 ? (
            // Serviço único — campo único
            <>
              <div className="space-y-2">
                <Label>O que está acontecendo?</Label>
                <Textarea
                  placeholder="Ex: Tomada não funciona no quarto, chuveiro vazando..."
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  className="min-h-[110px] rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Camera className="w-4 h-4" /> Fotos do problema *</Label>
                <p className="text-xs text-muted-foreground mb-2">Envie 2 fotos obrigatórias: uma próxima e uma ampla (mais afastada)</p>
                <div className="flex flex-wrap gap-2">
                  {form.problem_photos.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <div className="w-20 h-20 rounded-xl overflow-hidden border border-border">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground mt-1 block text-center">
                        Foto {idx + 1}
                      </span>
                      <button onClick={() => removePhoto(idx)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {form.problem_photos.length < 4 && (
                    <label className={cn("flex flex-col items-center justify-center cursor-pointer", uploadingPhotos && "opacity-50 pointer-events-none")}>
                      <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center hover:border-primary/50 transition-colors">
                        {uploadingPhotos ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /> : <Camera className="w-6 h-6 text-muted-foreground" />}
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">{uploadingPhotos ? "..." : "Adicionar"}</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} capture="environment" />
                    </label>
                  )}
                </div>
                {form.problem_photos.length < 2 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-2 text-xs text-orange-700">
                    ⚠️ Envie ao menos 2 fotos para continuar (próxima e ampla)
                  </div>
                )}
              </div>
            </>
          ) : (
            // Múltiplos serviços — campo individual por OS
            <div className="space-y-6">
              {form.service_type.map((serviceType, idx) => {
                const serviceLabel = SERVICE_TYPES.find(s => s.value === serviceType)?.label || serviceType;
                const Icon = SERVICE_TYPES.find(s => s.value === serviceType)?.icon || Wrench;
                const desc = descriptionsPerService[serviceType]?.description || '';
                const photos = descriptionsPerService[serviceType]?.photos || [];
                const isUploading = uploadingPhotosFor === serviceType;
                return (
                  <div key={serviceType} className="rounded-2xl border-2 border-border p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">OS {idx + 1} — {serviceLabel}</p>
                        <p className="text-xs text-muted-foreground">Descreva o problema específico deste serviço</p>
                      </div>
                    </div>
                    <Textarea
                      placeholder={`Ex: problema de ${serviceLabel.toLowerCase()}...`}
                      value={desc}
                      onChange={e => setServiceDesc(serviceType, 'description', e.target.value)}
                      className="min-h-[90px] rounded-xl"
                    />
                    <div className="space-y-2">
                       <Label className="flex items-center gap-2 text-xs"><Camera className="w-3 h-3" /> Fotos *</Label>
                       <p className="text-xs text-muted-foreground mb-1">Envie 2 fotos obrigatórias: próxima e ampla</p>
                       <div className="flex flex-wrap gap-2">
                         {photos.map((url, pidx) => (
                           <div key={pidx} className="flex flex-col items-center">
                             <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-border">
                               <img src={url} alt="" className="w-full h-full object-cover" />
                               <button onClick={() => removePhotoFor(serviceType, pidx)} className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center">
                                 <X className="w-2.5 h-2.5 text-white" />
                               </button>
                             </div>
                             <span className="text-[9px] text-muted-foreground mt-0.5">Foto {pidx + 1}</span>
                           </div>
                         ))}
                         {photos.length < 4 && (
                           <label className={cn("flex flex-col items-center justify-center cursor-pointer", isUploading && "opacity-50 pointer-events-none")}>
                             <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center hover:border-primary/50 transition-colors">
                               {isUploading ? <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" /> : <Camera className="w-5 h-5 text-muted-foreground" />}
                             </div>
                             <span className="text-[9px] text-muted-foreground mt-0.5">{isUploading ? "..." : "Adicionar"}</span>
                             <input type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotoUploadFor(e, serviceType)} capture="environment" />
                           </label>
                         )}
                       </div>
                       {photos.length < 2 && (
                         <div className="bg-orange-50 border border-orange-200 rounded-lg p-1.5 text-[10px] text-orange-700">
                           ⚠️ Envie 2 fotos para continuar
                         </div>
                       )}
                     </div>
                  </div>
                );
              })}
            </div>
          )}
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

          {/* Compartilhamento de localização em tempo real */}
          <button
            onClick={sharingLocation ? stopLiveLocation : startLiveLocation}
            className={cn(
              "w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left",
              sharingLocation ? "border-green-500 bg-green-50" : "border-dashed border-border hover:border-primary/50"
            )}
          >
            <div className={cn("w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center", sharingLocation ? "bg-green-500" : "bg-muted")}>
              {sharingLocation
                ? <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                : <Navigation className="w-3 h-3 text-muted-foreground" />}
            </div>
            <div className="flex-1">
              <p className={cn("font-semibold text-sm", sharingLocation ? "text-green-700" : "text-foreground")}>
                {sharingLocation ? "📡 Compartilhando localização em tempo real" : "Compartilhar localização em tempo real"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permite que o prestador te encontre com mais facilidade
              </p>
            </div>
          </button>
          </div>
          )}

          {/* Step 3b: Localização de Entrega (apenas para Reboque) */}
          {step === 3 && isTow && (
          <div className="space-y-5 mt-8 pt-8 border-t border-border">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-1">Local de entrega do veículo</h3>
            <p className="text-muted-foreground mb-4">Onde o veículo será rebocado?</p>
          </div>

          <button
            onClick={() => {
              getLocation();
              setTimeout(() => {
                if (location) {
                  setForm(prev => ({
                    ...prev,
                    delivery_address: location.address || prev.delivery_address,
                    delivery_city: location.city || prev.delivery_city,
                    delivery_state: location.state || prev.delivery_state,
                    delivery_latitude: location.latitude,
                    delivery_longitude: location.longitude,
                  }));
                }
              }, 500);
            }}
            disabled={geoLoading}
            className={cn(
              "w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left",
              form.delivery_latitude ? "border-primary bg-primary/5" : "border-dashed border-border hover:border-primary/50"
            )}
          >
            {geoLoading ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
            ) : (
              <Navigation className={cn("w-5 h-5 flex-shrink-0", form.delivery_latitude ? "text-primary" : "text-muted-foreground")} />
            )}
            <div>
              <p className={cn("font-semibold text-sm", form.delivery_latitude ? "text-primary" : "text-foreground")}>
                {geoLoading ? "Obtendo localização..." : form.delivery_latitude ? "Localização entrega obtida ✓" : "Usar minha localização atual"}
              </p>
              {form.delivery_latitude && <p className="text-xs text-muted-foreground mt-0.5">Localização de entrega confirmada</p>}
            </div>
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou digite o endereço</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>CEP de entrega</Label>
              <div className="relative">
                <Input
                  placeholder="00000-000"
                  value={form.delivery_cep}
                  onChange={e => set('delivery_cep', e.target.value)}
                  onBlur={() => searchByCep(form.delivery_cep, true)}
                  disabled={loadingCep}
                  className="rounded-2xl"
                />
                {loadingCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />}
              </div>
              {cepError && <p className="text-xs text-destructive">{cepError}</p>}
            </div>
            <div className="space-y-2">
              <Label>Rua de entrega</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nome da rua..."
                  value={form.delivery_address}
                  onChange={e => set('delivery_address', e.target.value)}
                  className="pl-10 rounded-2xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Número</Label>
                <Input placeholder="Nº" value={form.delivery_number} onChange={e => set('delivery_number', e.target.value)} className="rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input placeholder="Bairro" value={form.delivery_neighborhood} onChange={e => set('delivery_neighborhood', e.target.value)} className="rounded-2xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input placeholder="Cidade" value={form.delivery_city} onChange={e => set('delivery_city', e.target.value)} className="rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input placeholder="UF" value={form.delivery_state} onChange={e => set('delivery_state', e.target.value)} className="rounded-2xl" maxLength={2} />
              </div>
            </div>
          </div>

          {form.latitude && form.longitude && form.delivery_latitude && form.delivery_longitude && (
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
              <p className="text-sm font-semibold text-blue-900 mb-1">Distância calculada (ida e volta)</p>
              <p className="text-2xl font-bold text-blue-600">
                {(calcDistance(form.latitude, form.longitude, form.delivery_latitude, form.delivery_longitude) * 2).toFixed(1)} km
              </p>
              <p className="text-xs text-blue-700 mt-1">do local de saída até entrega e retorno</p>
            </div>
          )}
          {isTow && (!form.delivery_latitude || !form.latitude || !form.delivery_longitude || !form.longitude) && (
            <div className="bg-orange-50 rounded-2xl p-4 border border-orange-200">
              <p className="text-sm font-semibold text-orange-900 mb-1">⚠️ Distância não calculada</p>
              <p className="text-xs text-orange-700">Informe o endereço de saída e entrega para calcular a cobrança do reboque</p>
            </div>
          )}
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
                <Label className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Data preferida</Label>
                <Input
                  type="date"
                  value={form.scheduled_date}
                  onChange={e => {
                    set('scheduled_date', e.target.value);
                    set('scheduled_time', '');
                    fetchAvailableSlotsForDate(e.target.value);
                  }}
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  className="rounded-2xl"
                />
              </div>

              {form.scheduled_date && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Horário disponível
                    {loadingSlots && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                  </Label>
                  {!loadingSlots && scheduledAvailableSlots.length === 0 && (
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-sm text-red-700">
                      ⚠️ Nenhum horário disponível nesta data. Escolha outro dia.
                    </div>
                  )}
                  {!loadingSlots && scheduledAvailableSlots.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {scheduledAvailableSlots.map(slot => (
                        <button
                          key={slot}
                          onClick={() => set('scheduled_time', slot)}
                          className={cn(
                            "py-3 rounded-2xl border-2 text-sm font-semibold transition-all",
                            form.scheduled_time === slot
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:border-primary/40 text-foreground"
                          )}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
            <div className="space-y-2">
              <Label>Código de indicação <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input placeholder="Ex: AMIGO123" value={form.referral_code} onChange={e => set('referral_code', e.target.value.toUpperCase())} className="rounded-2xl" />
            </div>
          </div>
          {/* Resumo */}
          <div className="bg-primary/5 rounded-2xl p-4 border border-primary/20 space-y-1">
            <p className="text-sm font-semibold text-foreground mb-2">Resumo do pedido</p>
            {form.service_type.length > 1 ? (
              form.service_type.map((t, i) => (
                <p key={t} className="text-sm text-muted-foreground">🔧 OS {i+1}: {SERVICE_TYPES.find(s => s.value === t)?.label} — {(descriptionsPerService[t]?.description || '').slice(0, 40)}{(descriptionsPerService[t]?.description || '').length > 40 ? '...' : ''}</p>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">🔧 {form.service_type.map(t => SERVICE_TYPES.find(s => s.value === t)?.label).join(', ')}</p>
            )}
            <p className="text-sm text-muted-foreground">📍 {form.address}{form.number ? `, ${form.number}` : ''}{form.neighborhood ? ` - ${form.neighborhood}` : ''}{form.city ? `, ${form.city}` : ''}</p>
            {form.latitude && <p className="text-sm text-muted-foreground">📡 Localização GPS ativada</p>}
            {form.client_latitude && <p className="text-sm text-green-600 font-semibold">🟢 Localização em tempo real ativa</p>}
            {isTow && form.delivery_address && (
              <p className="text-sm text-muted-foreground">
                📌 Entrega: {form.delivery_address}{form.delivery_number ? `, ${form.delivery_number}` : ''}{form.delivery_neighborhood ? ` - ${form.delivery_neighborhood}` : ''}{form.delivery_city ? `, ${form.delivery_city}` : ''}
                {form.latitude && form.delivery_latitude && (
                  <span className="block mt-1 font-semibold text-blue-600">📏 Distância: {calcDistance(form.latitude, form.longitude, form.delivery_latitude, form.delivery_longitude).toFixed(1)} km</span>
                )}
              </p>
            )}
            {isTow && towPrice && (
              <p className="text-sm text-blue-600 font-bold">
                💰 Estimado: R$ {towPrice.total.toFixed(2)} ({towVehicleType})
              </p>
            )}
            {form.problem_photos.length > 0 && <p className="text-sm text-muted-foreground">📷 {form.problem_photos.length} foto(s) anexada(s)</p>}
             {form.client_suggested_price && <p className="text-sm text-muted-foreground">💰 Sugestão de valor: R$ {Number(form.client_suggested_price).toFixed(2)}</p>}
             <p className="text-sm text-muted-foreground">
               {form.modality === 'agendado' ? `📅 Agendado: ${form.scheduled_date} às ${form.scheduled_time}` : `⚡ ${URGENCY.find(u => u.value === form.urgency)?.label}`}
             </p>
          </div>
        </div>
      )}

      <div className="mt-8">
        {step < (needsRegister ? totalSteps - 1 : totalSteps) ? (
          <Button
            onClick={() => {
              if (step === 0) {
                createClientMutation.mutate();
              } else {
                setStep(s => s + 1);
              }
            }}
            disabled={!canNext() || createClientMutation.isPending}
            className="w-full h-14 rounded-2xl font-bold text-base bg-primary text-primary-foreground">
            {createClientMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continuar <ChevronRight className="ml-2 w-5 h-5" /></>}
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

      {/* Banner persistente de resposta do prestador ocupado — aparece mesmo após fechar o modal */}
      {activeBusyAlertId && !showProviderSearch && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 max-w-lg mx-auto">
          <BusyAlertClientView
            alertId={activeBusyAlertId}
            form={form}
            onConfirm={(formData) => {
              setActiveBusyAlertId(null);
              handleFinalConfirm(formData);
            }}
          />
        </div>
      )}

      {/* Banner dentro do modal enquanto modal está aberto — fecha o modal ao receber resposta */}
      {activeBusyAlertId && showProviderSearch && (
        <div className="hidden">
          <BusyAlertClientView
            alertId={activeBusyAlertId}
            form={form}
            onProviderResponded={() => setShowProviderSearch(false)}
            onConfirm={(formData) => {
              setActiveBusyAlertId(null);
              handleFinalConfirm(formData);
            }}
          />
        </div>
      )}

      {showProviderSearch && (
        <ProviderSearchModal
          form={{
            ...form,
            tv_size: tvSize,
            requires_two_providers: (form.service_type.includes('instalacao_suporte_tv') && tvSize === 'acima55') ||
              (form.service_type.includes('limpeza_caixa_dagua') && caixaDaguaTipo === 'condominio'),
          }}
          onConfirm={handleFinalConfirm}
          onSchedule={handleFinalConfirm}
          onClose={() => setShowProviderSearch(false)}
          onBusyAlertCreated={(id) => setActiveBusyAlertId(id)}
          onProviderResponded={() => setShowProviderSearch(false)}
        />
      )}
    </div>
  );
}