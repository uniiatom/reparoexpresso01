import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Loader2, CheckCircle2, XCircle, MapPin, Phone, User,
  Clock, AlertCircle, Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function normalize(str = '') {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const STATUS_STYLE = {
  pending:  { label: 'Pendente',  class: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Aprovado',  class: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejeitado', class: 'bg-red-100 text-red-800' },
};

export default function CoverageRequestsTab({ onPendingCountChange }) {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('pending');
  const [approveDialog, setApproveDialog] = useState(null);
  const [rejectDialog, setRejectDialog] = useState(null);
  const [approveDraft, setApproveDraft] = useState({ cityName: '', neighName: '', deliveryFee: '' });
  const [rejectNote, setRejectNote] = useState('');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-coverage-requests', filterStatus],
    queryFn: async () => {
      let q = supabase
        .from('service_coverage_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (filterStatus !== 'all') q = q.eq('status', filterStatus);
      const { data } = await q;
      return data ?? [];
    },
  });

  // Realtime: notifica quando chega novo chamado pendente
  useEffect(() => {
    const channel = supabase
      .channel('admin-coverage-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'service_coverage_requests',
      }, (payload) => {
        qc.invalidateQueries({ queryKey: ['admin-coverage-requests'] });
        toast.info(`Novo chamado de cobertura: ${payload.new.city_input} — ${payload.new.neighborhood_input}`);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [qc]);

  // Conta pendentes para o badge
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['admin-coverage-requests-pending-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('service_coverage_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    onPendingCountChange?.(pendingCount);
  }, [pendingCount, onPendingCountChange]);

  // ── Abrir diálogo de aprovação ─────────────────────────────────────────────
  const openApprove = (req) => {
    setApproveDraft({
      cityName: req.city_input ?? '',
      neighName: req.neighborhood_input ?? '',
      deliveryFee: '',
    });
    setApproveDialog(req);
  };

  // ── Aprovar: busca/cria cidade e bairro ────────────────────────────────────
  const handleApprove = useMutation({
    mutationFn: async () => {
      const req = approveDialog;
      if (!approveDraft.cityName.trim()) throw new Error('Informe o nome da cidade.');
      if (!approveDraft.neighName.trim()) throw new Error('Informe o nome do bairro.');

      const cityNorm = normalize(approveDraft.cityName);
      const neighNorm = normalize(approveDraft.neighName);

      // 1. Busca ou cria cidade
      let { data: cityFound } = await supabase
        .from('zone_cities')
        .select('id')
        .eq('name_norm', cityNorm)
        .maybeSingle();

      let cityId;
      if (cityFound) {
        cityId = cityFound.id;
        // Reativa se necessário
        await supabase.from('zone_cities').update({ active: true }).eq('id', cityId);
      } else {
        const { data: cityIns, error } = await supabase
          .from('zone_cities')
          .insert({ name: approveDraft.cityName.trim(), active: true })
          .select('id')
          .single();
        if (error) throw error;
        cityId = cityIns.id;
      }

      // 2. Busca ou cria bairro
      let { data: neighFound } = await supabase
        .from('zone_neighborhoods')
        .select('id')
        .eq('city_id', cityId)
        .eq('name_norm', neighNorm)
        .maybeSingle();

      if (!neighFound) {
        const { error } = await supabase.from('zone_neighborhoods').insert({
          city_id: cityId,
          name: approveDraft.neighName.trim(),
          active: true,
          allow_immediate: true,
          allow_scheduled: true,
          delivery_fee: approveDraft.deliveryFee !== '' ? Number(approveDraft.deliveryFee) : null,
        });
        if (error) throw error;
      }

      // 3. Atualiza chamado
      const { error } = await supabase
        .from('service_coverage_requests')
        .update({ status: 'approved', resolved_at: new Date().toISOString() })
        .eq('id', req.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coverage-requests'] });
      qc.invalidateQueries({ queryKey: ['admin-zone-cities'] });
      qc.invalidateQueries({ queryKey: ['admin-zone-neighborhoods'] });
      qc.invalidateQueries({ queryKey: ['admin-coverage-requests-pending-count'] });
      setApproveDialog(null);
      toast.success('Chamado aprovado! Cidade/bairro cadastrados.');
    },
    onError: (e) => toast.error(e.message || 'Erro ao aprovar chamado.'),
  });

  // ── Rejeitar ───────────────────────────────────────────────────────────────
  const handleReject = useMutation({
    mutationFn: async (req) => {
      const { error } = await supabase
        .from('service_coverage_requests')
        .update({
          status: 'rejected',
          admin_note: rejectNote.trim() || null,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', req.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coverage-requests'] });
      qc.invalidateQueries({ queryKey: ['admin-coverage-requests-pending-count'] });
      setRejectDialog(null);
      setRejectNote('');
      toast.success('Chamado rejeitado.');
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { value: 'pending', label: 'Pendentes', count: pendingCount },
          { value: 'approved', label: 'Aprovados' },
          { value: 'rejected', label: 'Rejeitados' },
          { value: 'all', label: 'Todos' },
        ].map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilterStatus(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors inline-flex items-center gap-1.5',
              filterStatus === f.value
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {f.label}
            {f.count != null && f.count > 0 && (
              <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {filterStatus === 'pending' ? 'Nenhum chamado pendente. 🎉' : 'Nenhum chamado neste filtro.'}
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const st = STATUS_STYLE[req.status] ?? STATUS_STYLE.pending;
            return (
              <div key={req.id} className="border border-border/50 rounded-xl p-4 bg-card/40 space-y-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={cn('text-xs border-0', st.class)}>{st.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="rounded-xl gap-1.5 h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => openApprove(req)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl gap-1.5 h-7 text-xs text-destructive border-destructive/30"
                        onClick={() => { setRejectDialog(req); setRejectNote(''); }}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Rejeitar
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                    <span className="font-medium">{req.city_input}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                    <span>{req.neighborhood_input}</span>
                  </div>
                  {req.customer_name && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-3.5 h-3.5 shrink-0" />
                      <span>{req.customer_name}</span>
                    </div>
                  )}
                  {req.customer_phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{req.customer_phone}</span>
                    </div>
                  )}
                  {req.full_address && (
                    <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs">{req.full_address}</span>
                    </div>
                  )}
                  {req.service_type && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs">Serviço: {req.service_type}</span>
                    </div>
                  )}
                  {req.admin_note && (
                    <div className="sm:col-span-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-2 py-1">
                      Nota admin: {req.admin_note}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog: Aprovar */}
      <Dialog open={!!approveDialog} onOpenChange={(v) => !v && setApproveDialog(null)}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Aprovar e cadastrar região
            </DialogTitle>
          </DialogHeader>
          {approveDialog && (
            <div className="space-y-3 py-1">
              <p className="text-sm text-muted-foreground">
                Confirme os dados antes de cadastrar a cidade/bairro no sistema.
              </p>
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome da cidade *</Label>
                  <Input
                    value={approveDraft.cityName}
                    onChange={(e) => setApproveDraft((p) => ({ ...p, cityName: e.target.value }))}
                    className="rounded-xl h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome do bairro *</Label>
                  <Input
                    value={approveDraft.neighName}
                    onChange={(e) => setApproveDraft((p) => ({ ...p, neighName: e.target.value }))}
                    className="rounded-xl h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Taxa de deslocamento (R$) — opcional</Label>
                  <Input
                    type="number" min="0" step="0.01"
                    value={approveDraft.deliveryFee}
                    onChange={(e) => setApproveDraft((p) => ({ ...p, deliveryFee: e.target.value }))}
                    placeholder="Deixe vazio para usar padrão da cidade"
                    className="rounded-xl h-9"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setApproveDialog(null)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleApprove.mutate()}
              disabled={handleApprove.isPending}
            >
              {handleApprove.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Aprovar e cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Rejeitar */}
      <Dialog open={!!rejectDialog} onOpenChange={(v) => !v && setRejectDialog(null)}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              Rejeitar chamado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">
              Região: <strong>{rejectDialog?.city_input}</strong> — {rejectDialog?.neighborhood_input}
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Motivo (opcional — visível internamente)</Label>
              <Textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Ex: Fora da área de cobertura planejada"
                className="rounded-xl min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setRejectDialog(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={() => handleReject.mutate(rejectDialog)}
              disabled={handleReject.isPending}
            >
              {handleReject.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Confirmar rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
