import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { slugifyGroupLabel } from '@/lib/offeredServiceGroups';

const EMPTY_GROUP = {
  label: '',
  slug: '',
  emoji: '',
  sort_order: 0,
  is_active: true,
};

export default function OfferedServiceGroupsDialog({ open, onOpenChange, groups = [], services = [] }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(null);

  const countBySlug = (slug) => services.filter((s) => s.service_group === slug).length;

  const saveGroup = useMutation({
    mutationFn: async (row) => {
      const payload = {
        label: row.label.trim(),
        slug: row.slug?.trim() || slugifyGroupLabel(row.label),
        emoji: row.emoji?.trim() || null,
        sort_order: Number(row.sort_order) || 0,
        is_active: row.is_active !== false,
      };
      if (!payload.label) throw new Error('Informe o nome do grupo.');
      if (row.id) return base44.entities.OfferedServiceGroup.update(row.id, payload);
      return base44.entities.OfferedServiceGroup.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offered-service-groups'] });
      qc.invalidateQueries({ queryKey: ['admin-offered-services'] });
      toast.success('Grupo salvo!');
      setDraft(null);
    },
    onError: (err) => toast.error(err.message || 'Erro ao salvar grupo.'),
  });

  const deleteGroup = useMutation({
    mutationFn: async (group) => {
      if (countBySlug(group.slug) > 0) {
        throw new Error('Não é possível excluir: há serviços neste grupo.');
      }
      return base44.entities.OfferedServiceGroup.delete(group.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offered-service-groups'] });
      toast.success('Grupo removido.');
    },
    onError: (err) => toast.error(err.message || 'Erro ao excluir grupo.'),
  });

  const openCreate = () => setDraft({ ...EMPTY_GROUP, sort_order: groups.length });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grupos de serviços</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Defina os grupos (ex.: Casa, Veículo, Empresa). Eles aparecem separados no cadastro do prestador.
        </p>

        <div className="space-y-2">
          {groups.map((group) => (
            <div
              key={group.id || group.slug}
              className="flex items-center gap-2 p-3 rounded-xl border border-border/50 bg-card/40"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {group.emoji ? `${group.emoji} ` : ''}{group.label}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono truncate">{group.slug}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {countBySlug(group.slug)} serv.
              </span>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDraft({ ...group })}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive"
                onClick={() => deleteGroup.mutate(group)}
                disabled={deleteGroup.isPending}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <Button variant="outline" className="rounded-xl w-full" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Novo grupo
        </Button>

        {draft && (
          <div className="rounded-2xl border border-primary/20 p-4 space-y-3 mt-2">
            <p className="text-sm font-semibold">{draft.id ? 'Editar grupo' : 'Novo grupo'}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input
                  value={draft.label}
                  onChange={(e) => setDraft((p) => ({
                    ...p,
                    label: e.target.value,
                    slug: p.id ? p.slug : slugifyGroupLabel(e.target.value),
                  }))}
                  placeholder="Ex.: Empresa"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Emoji (opcional)</Label>
                <Input
                  value={draft.emoji || ''}
                  onChange={(e) => setDraft((p) => ({ ...p, emoji: e.target.value }))}
                  placeholder="🏢"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Identificador (slug)</Label>
                <Input
                  value={draft.slug}
                  onChange={(e) => setDraft((p) => ({ ...p, slug: e.target.value }))}
                  className="rounded-xl font-mono text-xs"
                  disabled={!!draft.id}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={draft.sort_order}
                  onChange={(e) => setDraft((p) => ({ ...p, sort_order: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={draft.is_active !== false}
                onCheckedChange={(v) => setDraft((p) => ({ ...p, is_active: Boolean(v) }))}
              />
              Grupo ativo
            </label>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setDraft(null)}>Cancelar</Button>
              <Button onClick={() => saveGroup.mutate(draft)} disabled={saveGroup.isPending}>
                {saveGroup.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Salvar grupo
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
