import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Loader2, CheckCircle2,
  Eye, EyeOff, MapPin, Navigation, FileUp, CloudUpload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { useProviderServiceOptions } from '@/hooks/useProviderServiceOptions';
import { useProviderRegistrationDraft } from '@/hooks/useProviderRegistrationDraft';
import { resolveAllowedProviderServices } from '@/lib/offeredServices';
import ImagePickerField from '@/components/media/ImagePickerField';
import {
  DEFAULT_PROVIDER_FORM,
  providerToForm,
  registerProvider,
  updateProviderRecord,
} from '@/lib/providerRegistration';
import { createDefaultSchedule } from '@/lib/providerSchedule';
import { ProviderDayScheduleEditor } from '@/components/providers/ProviderDayScheduleEditor';
import ProviderServicesMultiSelect from '@/components/providers/ProviderServicesMultiSelect';
import ProviderDocumentsSection from '@/components/providers/ProviderDocumentsSection';
import { useOfferedServiceGroups } from '@/hooks/useOfferedServiceGroups';
import AppLoadingScreen from '@/components/ui/AppLoadingScreen';

// ─── Helper: formata CEP ─────────────────────────────────────────────────────
function formatCep(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return digits;
}

export default function ProviderRegistrationForm({
  mode = 'self',
  provider = null,
  userId,
  onSuccess,
  onCancel,
  className,
}) {
  const isAdmin = mode === 'admin';
  const isEdit = Boolean(provider?.id);
  const { user } = useAuth();
  const draftContext = isAdmin ? 'admin' : 'self';

  const [form, setForm] = useState({
    ...DEFAULT_PROVIDER_FORM,
    qualifications: [],
    schedule: createDefaultSchedule(),
  });
  const [customFieldValues, setCustomFieldValues] = useState({});
  const draftAppliedRef = useRef(false);

  const {
    isLoadingDraft,
    draftLoaded,
    saveStatus,
    lastSavedAt,
    restoredForm,
    restoredCustomFields,
    hasRestoredDraft,
    clearDraft,
  } = useProviderRegistrationDraft({
    context: draftContext,
    form,
    customFieldValues,
    enabled: Boolean(user?.id) && !isEdit,
  });

  const { data: providerAvailability = [], isLoading: isLoadingAvailability } = useQuery({
    queryKey: ['provider-availability', provider?.id],
    queryFn: () => base44.entities.ProviderAvailability.filter({ provider_id: provider.id }),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!isEdit || !provider) return;
    setForm(providerToForm(provider, providerAvailability));
  }, [isEdit, provider, providerAvailability]);

  useEffect(() => {
    if (!draftLoaded || draftAppliedRef.current) return;
    draftAppliedRef.current = true;
    if (restoredForm) {
      setForm(restoredForm);
      setCustomFieldValues(restoredCustomFields ?? {});
      if (hasRestoredDraft) {
        toast.message('Rascunho recuperado', {
          description: 'Continuamos de onde você parou no cadastro.',
        });
      }
    }
  }, [
    draftLoaded,
    restoredForm,
    restoredCustomFields,
    hasRestoredDraft,
  ]);

  // ── Password visibility ──────────────────────────────
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── GPS loading ──────────────────────────────────────
  const [gpsLoading, setGpsLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  // ── Config dinâmica do admin ─────────────────────────
  const { data: config = {} } = useQuery({
    queryKey: ['provider-config'],
    queryFn: async () => {
      const list = await base44.entities.ProviderConfig.list();
      return list[0] || {};
    },
  });

  const isRequired = (field) => {
    if (['name', 'phone', 'zip_code', 'street', 'city', 'state'].includes(field)) return true;
    return config.required_fields?.includes(field);
  };

  const { data: catalogServiceOptions = [], isLoading: isLoadingServices } = useProviderServiceOptions();
  const { data: serviceGroups = [] } = useOfferedServiceGroups();

  // ── Serviços disponíveis (catálogo admin + filtro de config) ────────
  const availableServices = resolveAllowedProviderServices(
    catalogServiceOptions,
    config.allowed_services,
    { activeOnly: true },
  );

  // ── Regiões disponíveis (do config) ─────────────────
  const allowedRegions = config.allowed_regions ?? [];

  // ── Helper set ───────────────────────────────────────
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  // ── Serviços (checkboxes, sem preço) ─────────────────
  const toggleService = (value) => {
    setForm((prev) => {
      const current = (prev.serviceOfferings ?? []).map((o) => o.serviceType);
      const next = current.includes(value)
        ? prev.serviceOfferings.filter((o) => o.serviceType !== value)
        : [...prev.serviceOfferings, { serviceType: value }];
      return { ...prev, serviceOfferings: next };
    });
  };

  // ── CEP lookup (ViaCEP) ──────────────────────────────
  const lookupCep = async (rawValue) => {
    const digits = rawValue.replace(/\D/g, '');
    if (digits.length < 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.error('CEP não encontrado. Preencha o endereço manualmente.');
        return;
      }
      setForm((prev) => ({
        ...prev,
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
      toast.success('Endereço preenchido pelo CEP!');
    } catch {
      toast.error('Não foi possível consultar o CEP. Preencha manualmente.');
    } finally {
      setCepLoading(false);
    }
  };

  // ── Região de atuação (tags) ─────────────────────────
  const toggleRegion = (region) => {
    setForm((prev) => {
      const current = prev.coverage_regions ?? [];
      const next = current.includes(region)
        ? current.filter((r) => r !== region)
        : [...current, region];
      return { ...prev, coverage_regions: next };
    });
  };

  // ── GPS ──────────────────────────────────────────────
  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não disponível neste navegador.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: { 'Accept-Language': 'pt-BR' } },
          );
          const data = await res.json();
          const addr = data?.address ?? {};

          // Região detectada (bairro ou cidade)
          const region =
            addr.suburb ||
            addr.neighbourhood ||
            addr.quarter ||
            addr.city_district ||
            addr.village ||
            addr.city ||
            addr.town ||
            data?.display_name?.split(',')[0] ||
            'Localização detectada';

          setForm((prev) => ({
            ...prev,
            // Endereço
            street: addr.road || addr.pedestrian || addr.path || prev.street,
            address_number: addr.house_number || prev.address_number,
            neighborhood: addr.suburb || addr.neighbourhood || addr.quarter || prev.neighborhood,
            city: addr.city || addr.town || addr.village || prev.city,
            state: (addr.state_code || addr.ISO3166_2_lvl4?.split('-')[1] || addr.state || prev.state)?.toUpperCase()?.slice(0, 2),
            zip_code: addr.postcode ? formatCep(addr.postcode) : prev.zip_code,
            // Coords
            coverage_latitude: latitude,
            coverage_longitude: longitude,
            // Região de atuação
            coverage_regions: prev.coverage_regions.includes(region)
              ? prev.coverage_regions
              : [...prev.coverage_regions, region],
          }));
          toast.success(`Localização detectada: ${region}`);
        } catch {
          toast.error('Não foi possível identificar o endereço. Preencha manualmente.');
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Permissão negada. Preencha manualmente.');
        } else {
          toast.error('Não foi possível obter a localização. Preencha manualmente.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  // ── Campos personalizados ─────────────────────────────
  const customFields = config.custom_registration_fields ?? [];
  const [uploadingField, setUploadingField] = useState(null);

  const setCustomField = (id, value) =>
    setCustomFieldValues((prev) => ({ ...prev, [id]: value }));

  const uploadCustomFile = async (fieldId, file) => {
    if (!file) return;
    setUploadingField(fieldId);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCustomField(fieldId, file_url);
      toast.success('Arquivo enviado!');
    } catch {
      toast.error('Falha ao enviar o arquivo.');
    } finally {
      setUploadingField(null);
    }
  };

  // ── Submit ────────────────────────────────────────────
  const submit = useMutation({
    mutationFn: () => {
      // Valida campos personalizados obrigatórios
      for (const field of customFields) {
        if (field.is_required && !customFieldValues[field.id]) {
          throw new Error(`O campo "${field.label}" é obrigatório.`);
        }
      }
      return isEdit
        ? updateProviderRecord({
          form: { ...form, custom_field_values: customFieldValues },
          providerId: provider.id,
          userId: provider.user_id,
        })
        : registerProvider({
          form: { ...form, custom_field_values: customFieldValues },
          userId,
          mode: isAdmin ? 'admin' : 'self',
        });
    },
    onSuccess: async (savedProvider) => {
      if (!isEdit) await clearDraft();
      toast.success(
        isEdit
          ? 'Prestador atualizado com sucesso!'
          : isAdmin
            ? 'Prestador cadastrado! Aguardando análise de documentos.'
            : 'Cadastro enviado! Aguarde a análise da equipe.',
      );
      if (!isEdit) {
        setForm({ ...DEFAULT_PROVIDER_FORM, qualifications: [], schedule: createDefaultSchedule() });
        setCustomFieldValues({});
        draftAppliedRef.current = false;
      }
      onSuccess?.(savedProvider);
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao cadastrar prestador.');
    },
  });

  // ─────────────────────────────────────────────────────
  if (isLoadingDraft || (isEdit && isLoadingAvailability)) {
    return <AppLoadingScreen fullScreen={false} className="min-h-[40vh] rounded-2xl" />;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {isEdit && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-sm font-medium text-foreground">Editando: {provider.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Altere os dados abaixo e salve. Para trocar a senha, preencha os campos de acesso.
          </p>
        </div>
      )}

      {user?.id && !isEdit && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <CloudUpload className="w-4 h-4 text-primary shrink-0" />
            <span>
              {hasRestoredDraft
                ? 'Rascunho recuperado — os dados são salvos automaticamente no banco.'
                : 'Os dados preenchidos são salvos automaticamente no banco enquanto você edita.'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground shrink-0">
            {saveStatus === 'saving' && 'Salvando rascunho…'}
            {saveStatus === 'saved' && lastSavedAt && (
              <>Salvo às {lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</>
            )}
            {saveStatus === 'error' && 'Não foi possível salvar o rascunho agora.'}
          </p>
        </div>
      )}

      {isAdmin && (
        <Card className="card-glow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">🔐 Dados de acesso</CardTitle>
            <p className="text-xs text-muted-foreground">
              {isEdit
                ? 'E-mail obrigatório. Deixe a senha em branco para manter a atual ou preencha para alterar.'
                : 'Informe e-mail e senha para o prestador acessar a plataforma.'}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="email@exemplo.com"
                className="rounded-xl"
                autoComplete="email"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  Senha {isEdit ? '(opcional)' : '*'}
                  <span className="text-muted-foreground font-normal"> · mín. 6</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    placeholder="••••••••"
                    className="rounded-xl pr-10"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Confirmar senha{isEdit ? '' : ' *'}</Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(e) => set('confirmPassword', e.target.value)}
                    placeholder="••••••••"
                    className={cn('rounded-xl pr-10', form.confirmPassword && form.password !== form.confirmPassword ? 'border-destructive focus-visible:ring-destructive' : '')}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-xs text-destructive">As senhas não coincidem</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══ ACESSO (somente modo self) ══════════════════ */}
      {!isAdmin && (
        <Card className="card-glow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              🔐 Dados de acesso
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Use este e-mail e senha para entrar na plataforma
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="rounded-xl"
                autoComplete="email"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Senha * <span className="text-muted-foreground font-normal">(mín. 6 caracteres)</span></Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    placeholder="••••••••"
                    className="rounded-xl pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Confirmar senha *</Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(e) => set('confirmPassword', e.target.value)}
                    placeholder="••••••••"
                    className={cn(
                      'rounded-xl pr-10',
                      form.confirmPassword && form.password !== form.confirmPassword
                        ? 'border-destructive focus-visible:ring-destructive'
                        : '',
                    )}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-xs text-destructive">As senhas não coincidem</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══ DADOS PESSOAIS ══════════════════════════════ */}
      <Card className="card-section">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dados pessoais</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Nome completo *</Label>
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Nome do prestador"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone / WhatsApp *</Label>
            <Input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="(11) 99999-9999"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Data de nascimento {isRequired('birth_date') ? '*' : '(opcional)'}</Label>
            <Input
              type="date"
              value={form.birth_date}
              onChange={(e) => set('birth_date', e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label>CPF {isRequired('cpf') ? '*' : '(opcional)'}</Label>
            <Input
              value={form.cpf}
              onChange={(e) => set('cpf', e.target.value)}
              placeholder="000.000.000-00"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>RG {isRequired('rg') ? '*' : '(opcional)'}</Label>
            <Input
              value={form.rg}
              onChange={(e) => set('rg', e.target.value)}
              placeholder="Número do RG"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <ImagePickerField
              label={`Foto de rosto${isRequired('photo_url') ? ' *' : ' (opcional)'}`}
              value={form.photo_url || ''}
              onChange={(url) => set('photo_url', url)}
              uploadSource="provider_photo"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <ImagePickerField
              label={`Foto de corpo inteiro${isRequired('photo_body_url') ? ' *' : ' (opcional)'}`}
              value={form.photo_body_url || ''}
              onChange={(url) => set('photo_body_url', url)}
              uploadSource="provider_photo"
            />
          </div>
        </CardContent>
      </Card>

      {/* ══ ENDEREÇO ════════════════════════════════════ */}
      <Card className="card-section">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Endereço</CardTitle>
          <p className="text-xs text-muted-foreground">
            Digite o CEP para preencher automaticamente, ou use o GPS.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">

          {/* Botão GPS */}
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl gap-2 border-primary/40 text-primary hover:bg-primary/5"
            onClick={detectLocation}
            disabled={gpsLoading || cepLoading}
          >
            {gpsLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            {gpsLoading ? 'Detectando localização...' : 'Preencher com minha localização atual'}
          </Button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* CEP */}
            <div className="space-y-1.5">
              <Label>CEP *</Label>
              <div className="relative">
                <Input
                  value={form.zip_code}
                  onChange={(e) => {
                    const formatted = formatCep(e.target.value);
                    set('zip_code', formatted);
                    if (formatted.replace(/\D/g, '').length === 8) {
                      lookupCep(formatted);
                    }
                  }}
                  placeholder="00000-000"
                  maxLength={9}
                  className="rounded-xl pr-8"
                />
                {cepLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Estado */}
            <div className="space-y-1.5">
              <Label>Estado (UF) *</Label>
              <Input
                value={form.state}
                onChange={(e) => set('state', e.target.value.toUpperCase().slice(0, 2))}
                placeholder="SP"
                maxLength={2}
                className="rounded-xl"
              />
            </div>

            {/* Rua */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Rua / Logradouro *</Label>
              <Input
                value={form.street}
                onChange={(e) => set('street', e.target.value)}
                placeholder="Rua das Flores"
                className="rounded-xl"
              />
            </div>

            {/* Número */}
            <div className="space-y-1.5">
              <Label>Número {isRequired('address_number') ? '*' : '(opcional)'}</Label>
              <Input
                value={form.address_number}
                onChange={(e) => set('address_number', e.target.value)}
                placeholder="123 ou S/N"
                className="rounded-xl"
              />
            </div>

            {/* Bairro */}
            <div className="space-y-1.5">
              <Label>Bairro {isRequired('neighborhood') ? '*' : '(opcional)'}</Label>
              <Input
                value={form.neighborhood}
                onChange={(e) => set('neighborhood', e.target.value)}
                placeholder="Centro"
                className="rounded-xl"
              />
            </div>

            {/* Cidade */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Cidade *</Label>
              <Input
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="São Paulo"
                className="rounded-xl"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ REGIÃO DE ATUAÇÃO ═══════════════════════════ */}
      <Card className="card-section">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Região de atuação *
          </CardTitle>
          {allowedRegions.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Selecione as regiões onde você presta serviço.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Informe os bairros ou zonas onde você atende.
              {form.coverage_regions.length > 0 && (
                <span className="ml-1 text-primary">
                  ({form.coverage_regions.length} selecionada{form.coverage_regions.length > 1 ? 's' : ''})
                </span>
              )}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {allowedRegions.length > 0 ? (
            /* Seleção de regiões pré-configuradas pelo admin */
            <div className="flex flex-wrap gap-2">
              {allowedRegions.map((region) => {
                const selected = form.coverage_regions.includes(region);
                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() => toggleRegion(region)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                    )}
                  >
                    <MapPin className="w-3 h-3" />
                    {region}
                    {selected && <CheckCircle2 className="w-3 h-3 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Entrada livre quando o admin não configurou regiões */
            <RegionFreeInput
              regions={form.coverage_regions}
              onAdd={(r) => {
                if (!form.coverage_regions.includes(r)) {
                  set('coverage_regions', [...form.coverage_regions, r]);
                }
              }}
              onRemove={(r) =>
                set('coverage_regions', form.coverage_regions.filter((x) => x !== r))
              }
            />
          )}
        </CardContent>
      </Card>

      {/* ══ OBSERVAÇÕES ═════════════════════════════════ */}
      <Card className="card-section">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Observações {isRequired('bio') ? '*' : '(opcional)'}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Ferramentas, diferenciais, experiência relevante ou outras informações úteis.
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.bio}
            onChange={(e) => set('bio', e.target.value)}
            placeholder="Ferramentas, diferenciais, experiência relevante..."
            className="rounded-xl min-h-[70px]"
          />
        </CardContent>
      </Card>

      {/* ══ SERVIÇOS ════════════════════════════════════ */}
      <Card className="card-section">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Serviços que você presta *</CardTitle>
          <p className="text-xs text-muted-foreground">
            Selecione na lista todos os tipos de serviço que você oferece (múltipla escolha).
          </p>
        </CardHeader>
        <CardContent>
          <ProviderServicesMultiSelect
            services={availableServices}
            groups={serviceGroups}
            selectedValues={form.serviceOfferings.map((o) => o.serviceType).filter(Boolean)}
            onToggle={toggleService}
            isLoading={isLoadingServices}
            emptyMessage="Nenhum serviço disponível. Cadastre serviços em Admin → Serviços Prestados ou ajuste as Configurações de Prestadores."
          />
        </CardContent>
      </Card>

      {/* ══ CAMPOS PERSONALIZADOS (definidos pelo admin) ═ */}
      {customFields.length > 0 && (
        <Card className="card-section">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informações adicionais</CardTitle>
            <p className="text-xs text-muted-foreground">
              Preencha os campos abaixo solicitados pela equipe.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {customFields.map((field) => (
              <div key={field.id} className="space-y-1.5">
                <Label>
                  {field.label}
                  {field.is_required ? ' *' : ' (opcional)'}
                </Label>

                {field.field_type === 'textarea' && (
                  <Textarea
                    value={customFieldValues[field.id] ?? ''}
                    onChange={(e) => setCustomField(field.id, e.target.value)}
                    placeholder={`Digite ${field.label.toLowerCase()}…`}
                    className="rounded-xl min-h-[80px]"
                  />
                )}

                {field.field_type === 'number' && (
                  <Input
                    type="number"
                    value={customFieldValues[field.id] ?? ''}
                    onChange={(e) => setCustomField(field.id, e.target.value)}
                    placeholder={`Digite ${field.label.toLowerCase()}…`}
                    className="rounded-xl"
                  />
                )}

                {field.field_type === 'file' && (
                  <div className="flex items-center gap-3">
                    <label className={cn(
                      'inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed cursor-pointer transition-colors text-sm',
                      uploadingField === field.id
                        ? 'border-primary/40 text-primary/60'
                        : 'border-border/50 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground',
                    )}>
                      {uploadingField === field.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <FileUp className="w-4 h-4" />}
                      {uploadingField === field.id ? 'Enviando…' : 'Selecionar arquivo'}
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => uploadCustomFile(field.id, e.target.files?.[0])}
                        disabled={!!uploadingField}
                      />
                    </label>
                    {customFieldValues[field.id] && (
                      <span className="text-xs text-primary font-medium">✓ Arquivo enviado</span>
                    )}
                  </div>
                )}

                {(field.field_type === 'text' || !field.field_type) && (
                  <Input
                    value={customFieldValues[field.id] ?? ''}
                    onChange={(e) => setCustomField(field.id, e.target.value)}
                    placeholder={`Digite ${field.label.toLowerCase()}…`}
                    className="rounded-xl"
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ══ DOCUMENTOS ══════════════════════════════════ */}
      <Card className="card-section">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Documentos</CardTitle>
          <p className="text-xs text-muted-foreground">
            Envie CNH, CRLV, comprovante de endereço, foto segurando documento e antecedentes.
            Após o cadastro, a equipe analisa em Documentos antes de liberar o acesso.
          </p>
        </CardHeader>
        <CardContent>
          <ProviderDocumentsSection form={form} set={set} isRequired={isRequired} />
        </CardContent>
      </Card>

      {/* ══ DISPONIBILIDADE ═════════════════════════════ */}
      <Card className="card-section">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Disponibilidade *</CardTitle>
          <p className="text-xs text-muted-foreground">
            Dias e horários em que você aceita chamados.
          </p>
        </CardHeader>
        <CardContent>
          <ProviderDayScheduleEditor
            schedule={form.schedule}
            onChange={(schedule) => setForm((prev) => ({ ...prev, schedule }))}
            allowedWeekdays={config.allowed_weekdays?.length ? config.allowed_weekdays : undefined}
            hoursStart={config.allowed_hours_start}
            hoursEnd={config.allowed_hours_end}
          />
        </CardContent>
      </Card>

      {/* ══ HOMOLOGAÇÃO ════════════════════════════════ */}
      {!isAdmin && (
        <button
          type="button"
          onClick={() => set('acceptsHomologation', !form.acceptsHomologation)}
          className={cn(
            'w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all',
            form.acceptsHomologation ? 'border-primary bg-primary/5' : 'border-border',
          )}
        >
          <div
            className={cn(
              'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
              form.acceptsHomologation
                ? 'bg-primary border-primary'
                : 'border-muted-foreground',
            )}
          >
            {form.acceptsHomologation && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
          </div>
          <p className="text-sm text-foreground">
            Entendo que passarei pelo{' '}
            <strong>teste de homologação na Escola Prática</strong> antes de receber chamados.
          </p>
        </button>
      )}

      {/* ══ BOTÕES ══════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="rounded-xl h-11 flex-1"
            onClick={onCancel}
          >
            Cancelar
          </Button>
        )}
        <Button
          type="button"
          className="rounded-xl h-11 flex-1 font-semibold"
          disabled={submit.isPending}
          onClick={() => submit.mutate()}
        >
          {submit.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
            </>
          ) : isEdit ? (
            'Salvar alterações'
          ) : isAdmin ? (
            'Cadastrar prestador'
          ) : (
            'Enviar cadastro para aprovação'
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Sub-componente: Entrada livre de regiões ────────────────────────────────
function RegionFreeInput({ regions, onAdd, onRemove }) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setInput('');
  };

  return (
    <div className="space-y-3">
      {regions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {regions.map((region) => (
            <span
              key={region}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20"
            >
              <MapPin className="w-3 h-3" />
              {region}
              <button
                type="button"
                onClick={() => onRemove(region)}
                className="ml-1 hover:text-destructive transition-colors"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Ex: Vila Mariana, Mooca, Zona Norte…"
          className="rounded-xl flex-1"
        />
        <Button
          type="button"
          variant="outline"
          className="rounded-xl px-3"
          onClick={add}
          disabled={!input.trim()}
        >
          +
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Pressione Enter ou vírgula para adicionar. Você pode adicionar várias regiões.
      </p>
    </div>
  );
}
