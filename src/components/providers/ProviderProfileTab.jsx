/**
 * ProviderProfileTab — redesign completo
 * • Layout 2 colunas no desktop (lg+)
 * • Exibe TODOS os campos cadastrais
 * • Edição inline por seção
 * • Ao salvar → is_approved = false → aparece em /admin?tab=documentos como pendência
 */
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { updateProvider } from '@/lib/repositories/providersRepository';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, MapPin, Navigation, X, Plus, KeyRound, CheckCircle2, User, Clock,
  Pencil, Save, AlertTriangle, Phone, Mail, Calendar, FileText, Shield,
  Home, BadgeCheck, XCircle, Eye,
  CreditCard, Fingerprint, Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ProviderDayScheduleEditor } from '@/components/providers/ProviderDayScheduleEditor';
import ImagePickerField from '@/components/media/ImagePickerField';
import {
  availabilityToSchedule,
  createDefaultSchedule,
  scheduleToAvailabilityRecords,
  validateSchedule,
} from '@/lib/providerSchedule';
import { PROVIDER_DOCUMENT_FIELD_MAP } from '@/lib/providerRegistrationFields';

const RESET_COOLDOWN_KEY = 'provider_pwd_reset_ts';
const RESET_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCep(v) {
  const d = (v || '').replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

function formatPhone(v) {
  const d = (v || '').replace(/\D/g, '').slice(0, 11);
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return d;
}

function StatusPill({ isApproved, isPending, isBlocked }) {
  if (isBlocked) return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/25">
      <XCircle className="w-3 h-3" /> Bloqueado
    </span>
  );
  if (isApproved) return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
      <BadgeCheck className="w-3 h-3" /> Aprovado
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">
      <Clock className="w-3 h-3" /> Em análise
    </span>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({ icon: Icon, title, subtitle, editing, onEdit, onCancel, onSave, saving, children, viewContent, editContent, noPending }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.07] bg-card/60 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {onEdit && !editing && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-primary/8"
          >
            <Pencil className="w-3.5 h-3.5" /> Editar
          </button>
        )}
        {editing && (
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-muted/50"
            >
              Cancelar
            </button>
            <Button
              size="sm"
              className="h-8 rounded-xl gap-1.5 text-xs"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar
            </Button>
          </div>
        )}
      </div>
      {/* Content */}
      <div className="px-5 py-4">
        <AnimatePresence mode="wait">
          {editing ? (
            <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {editContent}
            </motion.div>
          ) : (
            <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {viewContent || children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function InfoRow({ icon: Icon, label, value, className }) {
  return (
    <div className={cn('flex items-start gap-3 py-2.5 border-b border-white/[0.05] last:border-0', className)}>
      {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
        <p className="text-sm font-medium text-foreground mt-0.5 truncate">{value || <span className="text-muted-foreground/50 italic">Não informado</span>}</p>
      </div>
    </div>
  );
}

function FormField({ label, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs text-muted-foreground font-medium">{label}</Label>
      {children}
    </div>
  );
}

// ─── Document card (view) ─────────────────────────────────────────────────────

const DOC_STATUS_MAP = {
  aprovado:    { label: 'Aprovado',    cls: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25' },
  reprovado:   { label: 'Reprovado',   cls: 'bg-red-500/12 text-red-400 border-red-500/25' },
  pendente:    { label: 'Pendente',    cls: 'bg-amber-500/12 text-amber-400 border-amber-500/25' },
  nao_enviado: { label: 'Não enviado', cls: 'bg-zinc-500/12 text-zinc-400 border-zinc-500/25' },
};

function DocStatusBadge({ status }) {
  const cfg = DOC_STATUS_MAP[status] || DOC_STATUS_MAP.nao_enviado;
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold border', cfg.cls)}>
      {cfg.label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProviderProfileTab({ provider, onUpdate }) {
  const queryClient = useQueryClient();

  // ── Availability ────────────────────────────────────────────────────────────
  const { data: availabilities = [] } = useQuery({
    queryKey: ['provider-availability', provider?.id],
    queryFn: () => base44.entities.ProviderAvailability.filter({ provider_id: provider.id }),
    enabled: !!provider?.id,
  });

  const [schedule, setSchedule] = useState(createDefaultSchedule());
  useEffect(() => {
    if (availabilities.length) setSchedule(availabilityToSchedule(availabilities));
    else setSchedule(createDefaultSchedule());
  }, [availabilities]);

  // ── Editing states ──────────────────────────────────────────────────────────
  const [editingSection, setEditingSection] = useState(null); // 'personal' | 'address' | 'bio' | 'documents' | 'regions' | 'schedule'

  // ── Personal form ────────────────────────────────────────────────────────────
  const [personal, setPersonal] = useState({
    name: '', phone: '', cpf: '', rg: '', birth_date: '', photo_url: '', photo_body_url: '',
  });
  useEffect(() => {
    if (provider) setPersonal({
      name: provider.name || '',
      phone: provider.phone || '',
      cpf: provider.cpf || '',
      rg: provider.rg || '',
      birth_date: provider.birth_date || '',
      photo_url: provider.photo_url || '',
      photo_body_url: provider.photo_body_url || '',
    });
  }, [provider]);

  // ── Address form ─────────────────────────────────────────────────────────────
  const [address, setAddress] = useState({
    zip_code: '', street: '', address_number: '', neighborhood: '', city: '', state: '',
  });
  const [cepLoading, setCepLoading] = useState(false);
  useEffect(() => {
    if (provider) setAddress({
      zip_code: provider.zip_code || '',
      street: provider.street || provider.address?.split(',')[0] || '',
      address_number: provider.address_number || provider.address?.split(',')[1]?.trim() || '',
      neighborhood: provider.neighborhood || '',
      city: provider.city || '',
      state: provider.state || '',
    });
  }, [provider]);

  const lookupCep = async (val) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length < 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) { toast.error('CEP não encontrado.'); return; }
      setAddress(prev => ({
        ...prev,
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
    } catch { toast.error('Não foi possível consultar o CEP.'); }
    finally { setCepLoading(false); }
  };

  // ── Bio form ─────────────────────────────────────────────────────────────────
  const [bio, setBio] = useState('');
  useEffect(() => { if (provider) setBio(provider.bio || ''); }, [provider]);

  // ── Regions form ─────────────────────────────────────────────────────────────
  const [regions, setRegions] = useState([]);
  const [regionInput, setRegionInput] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  useEffect(() => { if (provider) setRegions(provider.coverage_regions ?? []); }, [provider]);

  const addRegion = (name) => {
    const t = name.trim();
    if (!t || regions.includes(t)) return;
    setRegions(prev => [...prev, t]);
  };
  const removeRegion = (r) => setRegions(prev => prev.filter(x => x !== r));

  const detectLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocalização não disponível.'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&addressdetails=1`,
            { headers: { 'Accept-Language': 'pt-BR' } },
          );
          const data = await res.json();
          const addr = data?.address ?? {};
          const region = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || addr.city || 'Localização detectada';
          addRegion(region);
          toast.success(`Região detectada: ${region}`);
        } catch { toast.error('Não foi possível identificar o endereço.'); }
        finally { setGpsLoading(false); }
      },
      () => { setGpsLoading(false); toast.error('Permissão de localização negada.'); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // ── Documents form ────────────────────────────────────────────────────────────
  const [docs, setDocs] = useState({
    cnh_url: '', crlv_url: '', address_proof_url: '',
    id_holding_document_url: '', background_check_url: '',
    cnh_expiry: '', crlv_expiry: '', crlv_vehicle_type: '',
  });
  useEffect(() => {
    if (provider) setDocs({
      cnh_url: provider.cnh_url || '',
      crlv_url: provider.crlv_url || '',
      address_proof_url: provider.address_proof_url || '',
      id_holding_document_url: provider.id_holding_document_url || '',
      background_check_url: provider.background_check_url || '',
      cnh_expiry: provider.cnh_expiry || '',
      crlv_expiry: provider.crlv_expiry || '',
      crlv_vehicle_type: provider.crlv_vehicle_type || '',
    });
  }, [provider]);

  // ── Password reset ────────────────────────────────────────────────────────────
  const [resetRequestedAt, setResetRequestedAt] = useState(() => {
    const stored = localStorage.getItem(RESET_COOLDOWN_KEY);
    return stored ? Number(stored) : null;
  });
  const canRequestReset = !resetRequestedAt || Date.now() - resetRequestedAt > RESET_COOLDOWN_MS;

  const requestPasswordReset = useMutation({
    mutationFn: () => base44.entities.Ticket.create({
      type: 'outro', subject: 'Redefinição de senha',
      message: `Prestador ${provider.name} (${provider.email || 'sem e-mail'}) solicita redefinição de senha. ID: ${provider.id}`,
      provider_id: provider.id, status: 'aberto',
    }),
    onSuccess: () => {
      const now = Date.now();
      localStorage.setItem(RESET_COOLDOWN_KEY, String(now));
      setResetRequestedAt(now);
      toast.success('Solicitação enviada! Nossa equipe entrará em contato em breve.');
    },
    onError: () => toast.error('Erro ao enviar solicitação. Tente novamente.'),
  });

  // ── Save helpers ─────────────────────────────────────────────────────────────

  /**
   * Salva alterações e, se o prestador estava aprovado, marca como pendente de revisão.
   * O prestador então aparece na aba /admin?tab=documentos como pendente.
   */
  const saveSection = useMutation({
    mutationFn: async (payload) => {
      const wasApproved = Boolean(provider?.is_approved);
      const updatePayload = { ...payload };
      if (wasApproved) {
        // Coloca de volta em análise para o admin revisar
        updatePayload.is_approved = false;
      }
      return updateProvider(provider.id, updatePayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-provider'] });
      onUpdate?.();
      setEditingSection(null);
      toast.success('Alterações enviadas para análise do administrador.', {
        description: 'Seus dados foram salvos e estão aguardando aprovação.',
        duration: 5000,
      });
    },
    onError: (err) => toast.error(err.message || 'Erro ao salvar. Tente novamente.'),
  });

  const saveAvailability = useMutation({
    mutationFn: async () => {
      const errors = validateSchedule(schedule);
      if (errors.length) throw new Error(errors[0]);
      await Promise.all(availabilities.map(a => base44.entities.ProviderAvailability.delete(a.id)));
      const records = scheduleToAvailabilityRecords(schedule, provider.id);
      await Promise.all(records.map(r => base44.entities.ProviderAvailability.create(r)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-availability', provider.id] });
      setEditingSection(null);
      toast.success('Disponibilidade atualizada!');
    },
    onError: (err) => toast.error(err.message || 'Erro ao salvar disponibilidade.'),
  });

  const isSaving = saveSection.isPending || saveAvailability.isPending;

  // ── Pending notice ────────────────────────────────────────────────────────────
  const isPending = provider && !provider.is_approved && !provider.is_blocked;

  // ── Doc review status ─────────────────────────────────────────────────────────
  const docList = Object.entries(PROVIDER_DOCUMENT_FIELD_MAP).map(([key, def]) => ({
    key, label: def.label,
    url: provider?.[def.urlKey],
    status: provider?.[def.urlKey]
      ? (provider[def.statusKey] || def.defaultStatus)
      : 'nao_enviado',
    rejectionReason: provider?.[def.rejectionKey],
    urlKey: def.urlKey,
  }));

  // ──────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 lg:space-y-0">

      {/* ── PENDING BANNER ── */}
      <AnimatePresence>
        {isPending && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4 flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-200">Perfil em análise</p>
              <p className="text-xs text-amber-200/70 mt-1 leading-relaxed">
                Suas informações estão sendo revisadas pela equipe. Em breve você receberá a confirmação.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ HEADER CARD (full width) ══════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-primary/12 via-primary/5 to-transparent overflow-hidden"
      >
        <div className="px-5 py-5 flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl border-2 border-primary/30 overflow-hidden bg-primary/10 flex items-center justify-center">
              {provider?.photo_url ? (
                <img src={provider.photo_url} alt={provider.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-primary" />
              )}
            </div>
            {provider?.is_approved && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-background">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-foreground leading-tight">
                {provider?.name || 'Prestador'}
              </h2>
              <StatusPill
                isApproved={provider?.is_approved}
                isPending={isPending}
                isBlocked={provider?.is_blocked}
              />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {provider?.email && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {provider.email}
                </p>
              )}
              {provider?.phone && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {provider.phone}
                </p>
              )}
              {provider?.city && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {provider.city}{provider.state ? `/${provider.state}` : ''}
                </p>
              )}
            </div>

            {/* Quick stats */}
            <div className="flex gap-4 mt-3">
              {[
                { label: 'Serviços', value: provider?.total_jobs ?? 0 },
                { label: 'Avaliação', value: provider?.average_rating ? `${Number(provider.average_rating).toFixed(1)}⭐` : '—' },
                { label: 'Nível', value: provider?.level || '1' },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <p className="text-base font-bold text-primary">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ══ DESKTOP 2-COLUMN GRID ═════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── COL 1 ── */}
        <div className="space-y-4">

          {/* DADOS PESSOAIS */}
          <Section
            icon={User}
            title="Dados pessoais"
            subtitle="Nome, telefone, CPF e RG"
            editing={editingSection === 'personal'}
            onEdit={() => setEditingSection('personal')}
            onCancel={() => { setEditingSection(null); }}
            onSave={() => saveSection.mutate(personal)}
            saving={isSaving}
            viewContent={
              <div>
                <InfoRow icon={User} label="Nome completo" value={provider?.name} />
                <InfoRow icon={Phone} label="Telefone" value={provider?.phone} />
                <InfoRow icon={CreditCard} label="CPF" value={provider?.cpf} />
                <InfoRow icon={Fingerprint} label="RG" value={provider?.rg} />
                <InfoRow icon={Calendar} label="Data de nascimento" value={provider?.birth_date} />
              </div>
            }
            editContent={
              <div className="space-y-3">
                <FormField label="Nome completo *">
                  <Input value={personal.name} onChange={e => setPersonal(p => ({...p, name: e.target.value}))} placeholder="Nome completo" className="rounded-xl" />
                </FormField>
                <FormField label="Telefone *">
                  <Input value={personal.phone} onChange={e => setPersonal(p => ({...p, phone: e.target.value}))} placeholder="(11) 99999-9999" className="rounded-xl" />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="CPF">
                    <Input value={personal.cpf} onChange={e => setPersonal(p => ({...p, cpf: e.target.value}))} placeholder="000.000.000-00" className="rounded-xl" />
                  </FormField>
                  <FormField label="RG">
                    <Input value={personal.rg} onChange={e => setPersonal(p => ({...p, rg: e.target.value}))} placeholder="00.000.000-0" className="rounded-xl" />
                  </FormField>
                </div>
                <FormField label="Data de nascimento">
                  <Input type="date" value={personal.birth_date} onChange={e => setPersonal(p => ({...p, birth_date: e.target.value}))} className="rounded-xl" />
                </FormField>
                <FormField label="Foto de rosto">
                  <ImagePickerField value={personal.photo_url} onChange={v => setPersonal(p => ({...p, photo_url: v}))} label="" uploadSource="provider" />
                </FormField>
                <FormField label="Foto corpo inteiro">
                  <ImagePickerField value={personal.photo_body_url} onChange={v => setPersonal(p => ({...p, photo_body_url: v}))} label="" uploadSource="provider" />
                </FormField>
              </div>
            }
          />

          {/* BIO / OBSERVAÇÕES */}
          <Section
            icon={FileText}
            title="Bio / Observações"
            subtitle="Apresentação profissional"
            editing={editingSection === 'bio'}
            onEdit={() => setEditingSection('bio')}
            onCancel={() => setEditingSection(null)}
            onSave={() => saveSection.mutate({ bio })}
            saving={isSaving}
            viewContent={
              <div>
                {provider?.bio ? (
                  <p className="text-sm text-foreground leading-relaxed">{provider.bio}</p>
                ) : (
                  <p className="text-sm text-muted-foreground/60 italic">Nenhuma bio informada.</p>
                )}
              </div>
            }
            editContent={
              <FormField label="Bio / Observações">
                <Textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Descreva sua experiência e especialidades..."
                  rows={4}
                  className="rounded-xl resize-none"
                />
              </FormField>
            }
          />

          {/* SEGURANÇA */}
          <Section
            icon={Shield}
            title="Segurança"
            subtitle="Redefinição de senha"
            viewContent={
              <div className="space-y-3">
                <div className="flex items-start gap-3 py-2">
                  <Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">E-mail de acesso</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{provider?.email || '—'}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Para alterar o e-mail, entre em contato com o suporte.</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl border-amber-500/30 text-amber-400 hover:bg-amber-500/8 gap-2"
                  onClick={() => requestPasswordReset.mutate()}
                  disabled={requestPasswordReset.isPending || !canRequestReset}
                >
                  {requestPasswordReset.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="w-3.5 h-3.5" />
                  )}
                  {!canRequestReset ? 'Solicitação enviada (aguarde 24h)' : 'Solicitar redefinição de senha'}
                </Button>
              </div>
            }
          />
        </div>

        {/* ── COL 2 ── */}
        <div className="space-y-4">

          {/* ENDEREÇO */}
          <Section
            icon={Home}
            title="Endereço"
            subtitle="CEP, rua, bairro e cidade"
            editing={editingSection === 'address'}
            onEdit={() => setEditingSection('address')}
            onCancel={() => setEditingSection(null)}
            onSave={() => {
              const addressStr = address.street
                ? `${address.street}${address.address_number ? ', ' + address.address_number : ''}`
                : '';
              saveSection.mutate({
                ...address,
                address: addressStr,
              });
            }}
            saving={isSaving}
            viewContent={
              <div>
                <InfoRow icon={Home} label="Logradouro" value={
                  [provider?.street || provider?.address?.split(',')[0], provider?.address_number].filter(Boolean).join(', ')
                } />
                <InfoRow icon={Building2} label="Bairro" value={provider?.neighborhood} />
                <InfoRow icon={MapPin} label="Cidade / Estado" value={
                  [provider?.city, provider?.state].filter(Boolean).join(' / ')
                } />
                <InfoRow icon={FileText} label="CEP" value={provider?.zip_code} />
              </div>
            }
            editContent={
              <div className="space-y-3">
                <FormField label="CEP">
                  <div className="flex gap-2">
                    <Input
                      value={formatCep(address.zip_code)}
                      onChange={e => {
                        const v = formatCep(e.target.value);
                        setAddress(prev => ({ ...prev, zip_code: v }));
                        lookupCep(v);
                      }}
                      placeholder="00000-000"
                      className="rounded-xl flex-1"
                    />
                    {cepLoading && <Loader2 className="w-4 h-4 animate-spin text-primary mt-2.5" />}
                  </div>
                </FormField>
                <FormField label="Rua / Logradouro">
                  <Input value={address.street} onChange={e => setAddress(p => ({...p, street: e.target.value}))} placeholder="Ex: Rua das Flores" className="rounded-xl" />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Número">
                    <Input value={address.address_number} onChange={e => setAddress(p => ({...p, address_number: e.target.value}))} placeholder="123" className="rounded-xl" />
                  </FormField>
                  <FormField label="Bairro">
                    <Input value={address.neighborhood} onChange={e => setAddress(p => ({...p, neighborhood: e.target.value}))} placeholder="Bairro" className="rounded-xl" />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Cidade">
                    <Input value={address.city} onChange={e => setAddress(p => ({...p, city: e.target.value}))} placeholder="Cidade" className="rounded-xl" />
                  </FormField>
                  <FormField label="Estado">
                    <Input value={address.state} onChange={e => setAddress(p => ({...p, state: e.target.value}))} placeholder="SP" maxLength={2} className="rounded-xl" />
                  </FormField>
                </div>
              </div>
            }
          />

          {/* REGIÃO DE ATUAÇÃO */}
          <Section
            icon={MapPin}
            title="Região de atuação"
            subtitle="Bairros e zonas onde você atende"
            editing={editingSection === 'regions'}
            onEdit={() => setEditingSection('regions')}
            onCancel={() => { setRegions(provider?.coverage_regions ?? []); setEditingSection(null); }}
            onSave={() => saveSection.mutate({ coverage_regions: regions })}
            saving={isSaving}
            viewContent={
              <div>
                {(provider?.coverage_regions ?? []).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(provider.coverage_regions ?? []).map(r => (
                      <span key={r} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                        <MapPin className="w-2.5 h-2.5" /> {r}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground/60 italic">Nenhuma região cadastrada.</p>
                )}
              </div>
            }
            editContent={
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl gap-2 border-primary/30 text-primary hover:bg-primary/8"
                  onClick={detectLocation}
                  disabled={gpsLoading}
                >
                  {gpsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                  {gpsLoading ? 'Detectando...' : 'Usar minha localização'}
                </Button>
                {regions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {regions.map(r => (
                      <span key={r} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                        <MapPin className="w-2.5 h-2.5" /> {r}
                        <button type="button" onClick={() => removeRegion(r)} className="ml-0.5 hover:text-destructive transition-colors">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={regionInput}
                    onChange={e => setRegionInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addRegion(regionInput); setRegionInput(''); } }}
                    placeholder="Ex: Vila Mariana, Mooca…"
                    className="rounded-xl flex-1 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl px-3"
                    onClick={() => { addRegion(regionInput); setRegionInput(''); }}
                    disabled={!regionInput.trim()}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            }
          />
        </div>
      </div>

      {/* ══ FULL-WIDTH SECTIONS ═══════════════════════════════════════════════ */}
      <div className="space-y-4 mt-4">

        {/* DISPONIBILIDADE */}
        <Section
          icon={Clock}
          title="Disponibilidade"
          subtitle="Dias e horários em que você aceita chamados"
          editing={editingSection === 'schedule'}
          onEdit={() => setEditingSection('schedule')}
          onCancel={() => setEditingSection(null)}
          onSave={() => saveAvailability.mutate()}
          saving={isSaving}
          viewContent={
            <div>
              {availabilities.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(
                    availabilities.reduce((acc, a) => {
                      const day = a.day_of_week;
                      if (!acc[day]) acc[day] = [];
                      acc[day].push(`${a.start_time?.slice(0, 5)} – ${a.end_time?.slice(0, 5)}`);
                      return acc;
                    }, {})
                  ).map(([day, times]) => (
                    <div key={day} className="bg-primary/8 border border-primary/15 rounded-xl p-2.5 text-center">
                      <p className="text-[11px] font-bold text-primary uppercase tracking-wider">{day}</p>
                      {times.map(t => <p key={t} className="text-[10px] text-muted-foreground mt-0.5">{t}</p>)}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/60 italic">Nenhuma disponibilidade cadastrada.</p>
              )}
            </div>
          }
          editContent={<ProviderDayScheduleEditor schedule={schedule} onChange={setSchedule} />}
        />

        {/* DOCUMENTOS */}
        <Section
          icon={FileText}
          title="Documentos"
          subtitle="CNH, CRLV, comprovantes e outros"
          editing={editingSection === 'documents'}
          onEdit={() => setEditingSection('documents')}
          onCancel={() => setEditingSection(null)}
          onSave={() => saveSection.mutate(docs)}
          saving={isSaving}
          viewContent={
            <div className="space-y-2">
              {docList.map(doc => (
                <div key={doc.key} className="flex items-center justify-between gap-3 py-2.5 border-b border-white/[0.05] last:border-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="text-sm font-medium text-foreground truncate">{doc.label}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> Ver
                      </a>
                    )}
                    <DocStatusBadge status={doc.status} />
                  </div>
                </div>
              ))}
              {/* Fotos */}
              {(provider?.photo_url || provider?.photo_body_url || provider?.id_holding_document_url) && (
                <div className="pt-2">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Fotos</p>
                  <div className="flex gap-2">
                    {[
                      { label: 'Rosto', url: provider?.photo_url },
                      { label: 'Corpo', url: provider?.photo_body_url },
                      { label: 'c/ doc.', url: provider?.id_holding_document_url },
                    ].filter(p => p.url).map(photo => (
                      <a key={photo.label} href={photo.url} target="_blank" rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 group">
                        <div className="w-14 h-14 rounded-xl overflow-hidden border border-border group-hover:border-primary/40 transition-colors">
                          <img src={photo.url} alt={photo.label} className="w-full h-full object-cover" />
                        </div>
                        <p className="text-[10px] text-muted-foreground">{photo.label}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          }
          editContent={
            <div className="space-y-4">
              <p className="text-xs text-amber-300/80 bg-amber-500/8 border border-amber-500/20 rounded-xl px-3 py-2">
                ⚠️ Ao salvar documentos, seu perfil será enviado para revisão do administrador.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="CNH – Carteira de Habilitação">
                  <ImagePickerField value={docs.cnh_url} onChange={v => setDocs(d => ({...d, cnh_url: v}))} label="" uploadSource="provider" />
                  <Input type="date" value={docs.cnh_expiry} onChange={e => setDocs(d => ({...d, cnh_expiry: e.target.value}))} placeholder="Validade da CNH" className="rounded-xl mt-2 text-xs" />
                </FormField>
                <FormField label="CRLV – Registro do Veículo">
                  <ImagePickerField value={docs.crlv_url} onChange={v => setDocs(d => ({...d, crlv_url: v}))} label="" uploadSource="provider" />
                  <div className="flex gap-2 mt-2">
                    <Input type="date" value={docs.crlv_expiry} onChange={e => setDocs(d => ({...d, crlv_expiry: e.target.value}))} className="rounded-xl flex-1 text-xs" />
                    <select
                      value={docs.crlv_vehicle_type}
                      onChange={e => setDocs(d => ({...d, crlv_vehicle_type: e.target.value}))}
                      className="rounded-xl border border-input bg-background text-xs px-2 py-1.5 flex-1"
                    >
                      <option value="">Tipo de veículo</option>
                      <option value="carro">Carro</option>
                      <option value="moto">Moto</option>
                    </select>
                  </div>
                </FormField>
                <FormField label="Comprovante de endereço">
                  <ImagePickerField value={docs.address_proof_url} onChange={v => setDocs(d => ({...d, address_proof_url: v}))} label="" uploadSource="provider" />
                </FormField>
                <FormField label="Foto segurando o documento">
                  <ImagePickerField value={docs.id_holding_document_url} onChange={v => setDocs(d => ({...d, id_holding_document_url: v}))} label="" uploadSource="provider" />
                </FormField>
                <FormField label="Antecedentes criminais" className="sm:col-span-2">
                  <ImagePickerField value={docs.background_check_url} onChange={v => setDocs(d => ({...d, background_check_url: v}))} label="" uploadSource="provider" />
                </FormField>
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}
