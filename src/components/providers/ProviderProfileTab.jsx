/**
 * ProviderProfileTab
 * Aba "Meu Perfil" no app do prestador.
 * Permite editar região de atuação e disponibilidade, além de solicitar redefinição de senha.
 */
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Loader2, MapPin, Navigation, X, Plus, KeyRound, CheckCircle2, User, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ProviderDayScheduleEditor } from '@/components/providers/ProviderDayScheduleEditor';
import OfferedServicesCatalog from '@/components/offered-services/OfferedServicesCatalog';
import {
  availabilityToSchedule,
  createDefaultSchedule,
  scheduleToAvailabilityRecords,
  validateSchedule,
} from '@/lib/providerSchedule';

const RESET_COOLDOWN_KEY = 'provider_pwd_reset_ts';
const RESET_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

export default function ProviderProfileTab({ provider, onUpdate }) {
  const queryClient = useQueryClient();

  // ── Dados básicos (read-only) ────────────────────────
  const readOnly = [
    { label: 'Nome', value: provider?.name },
    { label: 'Telefone', value: provider?.phone },
    { label: 'E-mail', value: provider?.email },
    { label: 'Cidade', value: provider?.city ? `${provider.city}/${provider.state}` : '—' },
  ];

  // ── Região de atuação ────────────────────────────────
  const [regions, setRegions] = useState(provider?.coverage_regions ?? []);
  const [regionInput, setRegionInput] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    setRegions(provider?.coverage_regions ?? []);
  }, [provider?.coverage_regions]);

  const addRegion = (name) => {
    const trimmed = name.trim();
    if (!trimmed || regions.includes(trimmed)) return;
    setRegions((prev) => [...prev, trimmed]);
  };

  const removeRegion = (name) => setRegions((prev) => prev.filter((r) => r !== name));

  const handleRegionKey = (e) => {
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
          addRegion(region);
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
          toast.error('Não foi possível obter a localização.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const saveRegions = useMutation({
    mutationFn: () =>
      base44.entities.Provider.update(provider.id, { coverage_regions: regions }),
    onSuccess: () => {
      toast.success('Regiões de atuação atualizadas!');
      queryClient.invalidateQueries({ queryKey: ['my-provider'] });
      onUpdate?.();
    },
    onError: () => toast.error('Erro ao salvar regiões. Tente novamente.'),
  });

  // ── Disponibilidade ──────────────────────────────────
  const { data: availabilities = [] } = useQuery({
    queryKey: ['provider-availability', provider?.id],
    queryFn: () => base44.entities.ProviderAvailability.filter({ provider_id: provider.id }),
    enabled: !!provider?.id,
  });

  const [schedule, setSchedule] = useState(createDefaultSchedule());

  useEffect(() => {
    if (availabilities.length) {
      setSchedule(availabilityToSchedule(availabilities));
    } else {
      setSchedule(createDefaultSchedule());
    }
  }, [availabilities]);

  const saveAvailability = useMutation({
    mutationFn: async () => {
      const errors = validateSchedule(schedule);
      if (errors.length) throw new Error(errors[0]);

      await Promise.all(availabilities.map((a) => base44.entities.ProviderAvailability.delete(a.id)));
      const records = scheduleToAvailabilityRecords(schedule, provider.id);
      await Promise.all(
        records.map((record) => base44.entities.ProviderAvailability.create(record)),
      );
    },
    onSuccess: () => {
      toast.success('Disponibilidade atualizada!');
      queryClient.invalidateQueries({ queryKey: ['provider-availability', provider.id] });
    },
    onError: (err) => toast.error(err.message || 'Erro ao salvar disponibilidade.'),
  });

  // ── Redefinição de senha ─────────────────────────────
  const [resetRequestedAt, setResetRequestedAt] = useState(() => {
    const stored = localStorage.getItem(RESET_COOLDOWN_KEY);
    return stored ? Number(stored) : null;
  });

  const canRequestReset =
    !resetRequestedAt || Date.now() - resetRequestedAt > RESET_COOLDOWN_MS;

  const requestPasswordReset = useMutation({
    mutationFn: () =>
      base44.entities.Ticket.create({
        type: 'outro',
        subject: 'Redefinição de senha',
        message: `Prestador ${provider.name} (${provider.email || 'sem e-mail'}) solicita redefinição de senha. ID do prestador: ${provider.id}`,
        provider_id: provider.id,
        status: 'aberto',
      }),
    onSuccess: () => {
      const now = Date.now();
      localStorage.setItem(RESET_COOLDOWN_KEY, String(now));
      setResetRequestedAt(now);
      toast.success('Solicitação enviada! Nossa equipe entrará em contato em breve.');
      queryClient.invalidateQueries({ queryKey: ['provider-tickets', provider.id] });
    },
    onError: () => toast.error('Erro ao enviar solicitação. Tente novamente.'),
  });

  // ─────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ══ DADOS BÁSICOS ════════════════════════════════ */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Meus dados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {readOnly.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-medium text-foreground">{value || '—'}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ══ REGIÃO DE ATUAÇÃO ═══════════════════════════ */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Região de atuação
          </CardTitle>
          <p className="text-xs text-muted-foreground">Bairros e zonas onde você atende</p>
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

          {/* Tags das regiões */}
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
              onKeyDown={handleRegionKey}
              placeholder="Ex: Vila Mariana, Mooca, Zona Norte…"
              className="rounded-xl flex-1"
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-xl px-3"
              onClick={() => { addRegion(regionInput); setRegionInput(''); }}
              disabled={!regionInput.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <Button
            type="button"
            className="w-full rounded-xl font-semibold"
            onClick={() => saveRegions.mutate()}
            disabled={saveRegions.isPending || regions.length === 0}
          >
            {saveRegions.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Salvar regiões</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ══ DISPONIBILIDADE ═════════════════════════════ */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Disponibilidade
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Dias e horários em que você aceita chamados
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProviderDayScheduleEditor schedule={schedule} onChange={setSchedule} />

          <Button
            type="button"
            className="w-full rounded-xl font-semibold"
            onClick={() => saveAvailability.mutate()}
            disabled={saveAvailability.isPending}
          >
            {saveAvailability.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Salvar disponibilidade</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ══ SEGURANÇA ════════════════════════════════════ */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" /> Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Para redefinir sua senha, clique no botão abaixo. Nossa equipe enviará as instruções
            para o seu e-mail cadastrado.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl border-orange-300 text-orange-600 hover:bg-orange-50 font-semibold gap-2"
            onClick={() => requestPasswordReset.mutate()}
            disabled={requestPasswordReset.isPending || !canRequestReset}
          >
            {requestPasswordReset.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <KeyRound className="w-4 h-4" />
            )}
            {!canRequestReset
              ? 'Solicitação já enviada (aguarde 24h)'
              : 'Solicitar redefinição de senha'}
          </Button>
          {!canRequestReset && (
            <p className="text-xs text-muted-foreground text-center">
              Você já enviou uma solicitação recentemente. Aguarde 24h para enviar outra.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Serviços disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <OfferedServicesCatalog title="Serviços que você pode atender" />
        </CardContent>
      </Card>
    </div>
  );
}
