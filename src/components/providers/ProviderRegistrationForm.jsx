import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Loader2, Plus, Trash2, CheckCircle2,
  Eye, EyeOff, MapPin, Navigation, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PROVIDER_SERVICE_TYPES } from '@/lib/constants/providerServiceTypes';
import {
  DEFAULT_PROVIDER_FORM,
  registerProvider,
} from '@/lib/providerRegistration';
import { createDefaultSchedule } from '@/lib/providerSchedule';
import { ProviderDayScheduleEditor } from '@/components/providers/ProviderDayScheduleEditor';

export default function ProviderRegistrationForm({
  mode = 'self',
  userId,
  onSuccess,
  onCancel,
  className,
}) {
  const isAdmin = mode === 'admin';

  const [form, setForm] = useState({
    ...DEFAULT_PROVIDER_FORM,
    qualifications: [],
    schedule: createDefaultSchedule(),
  });
  const [autoApprove, setAutoApprove] = useState(false);

  // ── Password visibility ──────────────────────────────
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── GPS / Região ─────────────────────────────────────
  const [gpsLoading, setGpsLoading] = useState(false);
  const [regionInput, setRegionInput] = useState('');

  // ── Config dinâmica ──────────────────────────────────
  const { data: config = { required_fields: [] } } = useQuery({
    queryKey: ['provider-config'],
    queryFn: async () => {
      const list = await base44.entities.ProviderConfig.list();
      return list[0] || { required_fields: [] };
    },
  });

  const isRequired = (field) => {
    if (['name', 'phone', 'address', 'city', 'state', 'zip_code', 'qualifications', 'experience_years'].includes(field)) return true;
    return config.required_fields?.includes(field);
  };

  // ── Qualificações dinâmicas ──────────────────────────
  const { data: qualificationsList = [] } = useQuery({
    queryKey: ['qualifications'],
    queryFn: () => base44.entities.Qualification.list(),
  });

  // ── Helpers de estado ────────────────────────────────
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const toggleQualification = (qualName) => {
    setForm((prev) => {
      const current = Array.isArray(prev.qualifications) ? prev.qualifications : [];
      const next = current.includes(qualName)
        ? current.filter((q) => q !== qualName)
        : [...current, qualName];
      return { ...prev, qualifications: next };
    });
  };

  // ── Região de atuação ────────────────────────────────
  const addRegion = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setForm((prev) => {
      if (prev.coverage_regions.includes(trimmed)) return prev;
      return { ...prev, coverage_regions: [...prev.coverage_regions, trimmed] };
    });
  };

  const removeRegion = (name) => {
    setForm((prev) => ({
      ...prev,
      coverage_regions: prev.coverage_regions.filter((r) => r !== name),
    }));
  };

  const handleRegionInputKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addRegion(regionInput);
      setRegionInput('');
    }
  };

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

          // Salva coords e adiciona a região
          setForm((prev) => ({
            ...prev,
            coverage_latitude: latitude,
            coverage_longitude: longitude,
            coverage_regions: prev.coverage_regions.includes(region)
              ? prev.coverage_regions
              : [...prev.coverage_regions, region],
          }));
          toast.success(`Região detectada: ${region}`);
        } catch {
          toast.error('Não foi possível identificar o endereço. Informe manualmente.');
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Permissão negada. Informe sua região manualmente.');
        } else {
          toast.error('Não foi possível obter a localização. Informe manualmente.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  // ── Serviços ─────────────────────────────────────────
  const updateOffering = (index, field, value) =>
    setForm((prev) => {
      const next = [...prev.serviceOfferings];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, serviceOfferings: next };
    });

  const addOffering = () =>
    setForm((prev) => ({
      ...prev,
      serviceOfferings: [...prev.serviceOfferings, { serviceType: '', hourlyRate: '' }],
    }));

  const removeOffering = (index) =>
    setForm((prev) => ({
      ...prev,
      serviceOfferings: prev.serviceOfferings.filter((_, i) => i !== index),
    }));

  // ── Submit ────────────────────────────────────────────
  const submit = useMutation({
    mutationFn: () =>
      registerProvider({
        form,
        userId,
        autoApprove: isAdmin && autoApprove,
        mode: isAdmin ? 'admin' : 'self',
      }),
    onSuccess: (provider) => {
      toast.success(
        isAdmin
          ? 'Prestador cadastrado com sucesso!'
          : 'Cadastro enviado! Aguarde a análise da equipe.',
      );
      setForm({ ...DEFAULT_PROVIDER_FORM, qualifications: [], schedule: createDefaultSchedule() });
      onSuccess?.(provider);
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao cadastrar prestador.');
    },
  });

  // ─────────────────────────────────────────────────────
  return (
    <div className={cn('space-y-4', className)}>

      {/* ══ ACESSO (somente modo self) ══════════════════ */}
      {!isAdmin && (
        <Card className="border-primary/30 bg-primary/2">
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
      <Card className="border-border/60">
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
          {/* E-mail no modo admin (no self fica no card Acesso) */}
          {isAdmin && (
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="email@exemplo.com"
                className="rounded-xl"
              />
            </div>
          )}
          {!isAdmin && (
            <>
              <div className="space-y-1.5">
                <Label>Data de nascimento *</Label>
                <Input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => set('birth_date', e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>CPF *</Label>
                <Input
                  value={form.cpf}
                  onChange={(e) => set('cpf', e.target.value)}
                  placeholder="000.000.000-00"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>RG *</Label>
                <Input
                  value={form.rg}
                  onChange={(e) => set('rg', e.target.value)}
                  placeholder="Número do RG"
                  className="rounded-xl"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ══ ENDEREÇO ════════════════════════════════════ */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Endereço *</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>CEP *</Label>
            <Input
              value={form.zip_code}
              onChange={(e) => set('zip_code', e.target.value)}
              placeholder="00000-000"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Rua e número *</Label>
            <Input
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Rua das Flores, 123"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Bairro</Label>
            <Input
              value={form.neighborhood}
              onChange={(e) => set('neighborhood', e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cidade *</Label>
            <Input
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Estado (UF) *</Label>
            <Input
              value={form.state}
              onChange={(e) => set('state', e.target.value)}
              maxLength={2}
              placeholder="SP"
              className="rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      {/* ══ REGIÃO DE ATUAÇÃO ═══════════════════════════ */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Região de atuação *
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Informe os bairros ou zonas onde você atende
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Botão GPS */}
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl gap-2 border-primary/40 text-primary hover:bg-primary/5"
            onClick={detectLocation}
            disabled={gpsLoading}
          >
            {gpsLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            {gpsLoading ? 'Detectando localização...' : 'Usar minha localização atual'}
          </Button>

          {/* Tags das regiões selecionadas */}
          {form.coverage_regions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.coverage_regions.map((region) => (
                <span
                  key={region}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20"
                >
                  <MapPin className="w-3 h-3" />
                  {region}
                  <button
                    type="button"
                    onClick={() => removeRegion(region)}
                    className="ml-1 hover:text-destructive transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Input manual */}
          <div className="flex gap-2">
            <Input
              value={regionInput}
              onChange={(e) => setRegionInput(e.target.value)}
              onKeyDown={handleRegionInputKey}
              placeholder="Ex: Vila Mariana, Mooca, Zona Norte…"
              className="rounded-xl flex-1"
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-xl px-3"
              onClick={() => {
                addRegion(regionInput);
                setRegionInput('');
              }}
              disabled={!regionInput.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Pressione Enter ou vírgula para adicionar. Você pode adicionar várias regiões.
          </p>
        </CardContent>
      </Card>

      {/* ══ QUALIFICAÇÕES ═══════════════════════════════ */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Qualificações *</CardTitle>
          <p className="text-xs text-muted-foreground">
            Selecione suas certificações e informe sua experiência
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {qualificationsList.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Nenhuma qualificação cadastrada ainda. A equipe pode adicionar opções no painel admin.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {qualificationsList.map((qual) => (
                <label
                  key={qual.id}
                  className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={form.qualifications.includes(qual.name)}
                    onCheckedChange={() => toggleQualification(qual.name)}
                  />
                  <span className="text-sm font-medium">{qual.name}</span>
                </label>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Anos de experiência *</Label>
              <Input
                type="number"
                min={0}
                value={form.experience_years}
                onChange={(e) => set('experience_years', e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>
              Observações {isRequired('bio') ? '*' : '(opcional)'}
            </Label>
            <Textarea
              value={form.bio}
              onChange={(e) => set('bio', e.target.value)}
              placeholder="Ferramentas, diferenciais, regiões que atende..."
              className="rounded-xl min-h-[70px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* ══ SERVIÇOS E PREÇO ════════════════════════════ */}
      <Card className="border-border/60">
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Serviços e preço por hora *</CardTitle>
          <Button type="button" size="sm" variant="outline" className="rounded-xl h-8 shrink-0" onClick={addOffering}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.serviceOfferings.map((offering, index) => (
            <div
              key={index}
              className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2 items-end"
            >
              <div className="space-y-1.5">
                <Label>Tipo de serviço</Label>
                <Select
                  value={offering.serviceType}
                  onValueChange={(v) => updateOffering(index, 'serviceType', v)}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_SERVICE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>R$/hora</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={offering.hourlyRate}
                  onChange={(e) => updateOffering(index, 'hourlyRate', e.target.value)}
                  placeholder="0,00"
                  className="rounded-xl"
                />
              </div>
              {form.serviceOfferings.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-xl text-destructive"
                  onClick={() => removeOffering(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ══ DISPONIBILIDADE ═════════════════════════════ */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Disponibilidade *</CardTitle>
          <p className="text-xs text-muted-foreground">
            Dias e horários em que você aceita chamados
          </p>
        </CardHeader>
        <CardContent>
          <ProviderDayScheduleEditor
            schedule={form.schedule}
            onChange={(schedule) => setForm((prev) => ({ ...prev, schedule }))}
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

      {isAdmin && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <Checkbox
            checked={autoApprove}
            onCheckedChange={(v) => setAutoApprove(Boolean(v))}
          />
          Aprovar prestador imediatamente após cadastro
        </label>
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
