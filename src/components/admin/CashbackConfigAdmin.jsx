import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Pencil, Save, X, Plus, Trash2, Users, Wrench } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_PRESTADOR = [
  { nivel: 'Prata',    owner_type: 'prestador', min_jobs: 120, max_jobs: 159, min_rating: 4.0, bonus_fixo: 3.00, is_active: true },
  { nivel: 'Ouro',     owner_type: 'prestador', min_jobs: 160, max_jobs: 189, min_rating: 4.0, bonus_fixo: 3.50, is_active: true },
  { nivel: 'Diamante', owner_type: 'prestador', min_jobs: 190, max_jobs: 219, min_rating: 4.0, bonus_fixo: 4.00, is_active: true },
  { nivel: 'Rubi',     owner_type: 'prestador', min_jobs: 220, max_jobs: null, min_rating: 4.5, bonus_fixo: 5.00, is_active: true },
];

const DEFAULT_CLIENTE = [
  { nivel: 'Iniciante',  owner_type: 'cliente', min_amigos: 0,  max_amigos: 9,  bonus_fixo: 2.50, percent_take: 6.9,  is_active: true },
  { nivel: 'Pro',        owner_type: 'cliente', min_amigos: 10, max_amigos: 19, bonus_fixo: 3.50, percent_take: 9.7,  is_active: true },
  { nivel: 'Elite',      owner_type: 'cliente', min_amigos: 20, max_amigos: 34, bonus_fixo: 4.50, percent_take: 12.5, is_active: true },
  { nivel: 'Lendário',   owner_type: 'cliente', min_amigos: 35, max_amigos: 49, bonus_fixo: 5.50, percent_take: 15.2, is_active: true },
  { nivel: 'Imperador',  owner_type: 'cliente', min_amigos: 50, max_amigos: 70, bonus_fixo: 7.00, percent_take: 19.4, is_active: true },
];

function NivelRow({ item, onEdit, onDelete, onToggle }) {
  const isPrestador = item.owner_type === 'prestador';

  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm text-foreground">{item.nivel}</span>
          <Badge variant="outline" className="text-[10px]">
            {isPrestador ? '🔧 Prestador' : '👥 Cliente'}
          </Badge>
          {!item.is_active && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isPrestador
            ? `${item.min_jobs}${item.max_jobs ? `–${item.max_jobs}` : '+'} serviços · mín. ${item.min_rating}★ · R$ ${Number(item.bonus_fixo).toFixed(2)}/serviço`
            : `${item.min_amigos}${item.max_amigos ? `–${item.max_amigos}` : '+'} amigos · R$ ${Number(item.bonus_fixo).toFixed(2)} fixo + ${item.percent_take}% take`
          }
        </p>
      </div>
      <Switch checked={!!item.is_active} onCheckedChange={(v) => onToggle(item, v)} />
      <Button size="icon" variant="ghost" onClick={() => onEdit(item)}><Pencil className="w-4 h-4" /></Button>
      <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(item.id)}><Trash2 className="w-4 h-4" /></Button>
    </div>
  );
}

const EMPTY_PRESTADOR = { nivel: '', owner_type: 'prestador', min_jobs: 0, max_jobs: '', min_rating: 4.0, bonus_fixo: 0, is_active: true };
const EMPTY_CLIENTE = { nivel: '', owner_type: 'cliente', min_amigos: 0, max_amigos: '', bonus_fixo: 0, percent_take: 0, is_active: true };

export default function CashbackConfigAdmin() {
  const qc = useQueryClient();
  const [editItem, setEditItem] = useState(null); // null = fechado, {} = novo
  const [tab, setTab] = useState('prestador');

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['cashback-configs'],
    queryFn: () => base44.entities.CashbackConfig.list(),
  });

  const save = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        config_key: `${data.owner_type}_${data.nivel.toLowerCase().replace(/\s+/g, '_')}`,
        max_jobs: data.max_jobs === '' || data.max_jobs === null ? null : Number(data.max_jobs),
        max_amigos: data.max_amigos === '' || data.max_amigos === null ? null : Number(data.max_amigos),
        min_jobs: Number(data.min_jobs) || 0,
        min_amigos: Number(data.min_amigos) || 0,
        min_rating: Number(data.min_rating) || 0,
        bonus_fixo: Number(data.bonus_fixo) || 0,
        percent_take: Number(data.percent_take) || 0,
      };
      return data.id
        ? base44.entities.CashbackConfig.update(data.id, payload)
        : base44.entities.CashbackConfig.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries(['cashback-configs']); setEditItem(null); toast.success('Salvo!'); },
  });

  const del = useMutation({
    mutationFn: (id) => base44.entities.CashbackConfig.delete(id),
    onSuccess: () => { qc.invalidateQueries(['cashback-configs']); toast.success('Removido.'); },
  });

  const toggle = useMutation({
    mutationFn: ({ item, val }) => base44.entities.CashbackConfig.update(item.id, { is_active: val }),
    onSuccess: () => qc.invalidateQueries(['cashback-configs']),
  });

  const seedDefaults = async () => {
    const defaults = tab === 'prestador' ? DEFAULT_PRESTADOR : DEFAULT_CLIENTE;
    for (const d of defaults) {
      await base44.entities.CashbackConfig.create({
        ...d,
        config_key: `${d.owner_type}_${d.nivel.toLowerCase().replace(/\s+/g, '_')}`,
      });
    }
    qc.invalidateQueries(['cashback-configs']);
    toast.success('Valores padrão carregados!');
  };

  const filtered = configs.filter(c => c.owner_type === tab);
  const isPrestador = tab === 'prestador';
  const editing = editItem;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Configuração de Cashback</h2>
          <p className="text-sm text-muted-foreground">Defina os valores de bônus por nível de prestadores e clientes.</p>
        </div>
        {filtered.length === 0 && !isLoading && (
          <Button variant="outline" size="sm" onClick={seedDefaults}>
            📥 Carregar valores padrão
          </Button>
        )}
        <Button size="sm" onClick={() => setEditItem(isPrestador ? { ...EMPTY_PRESTADOR } : { ...EMPTY_CLIENTE })}>
          <Plus className="w-4 h-4 mr-1" /> Novo nível
        </Button>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('prestador')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'prestador' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          <Wrench className="w-4 h-4" /> Prestadores
        </button>
        <button
          onClick={() => setTab('cliente')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'cliente' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          <Users className="w-4 h-4" /> Clientes
        </button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <p className="text-muted-foreground text-sm">Nenhum nível configurado ainda.</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Carregar valores padrão" ou adicione manualmente.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered
            .sort((a, b) => (a.min_jobs ?? a.min_amigos ?? 0) - (b.min_jobs ?? b.min_amigos ?? 0))
            .map(item => (
              <NivelRow
                key={item.id}
                item={item}
                onEdit={setEditItem}
                onDelete={(id) => del.mutate(id)}
                onToggle={(item, val) => toggle.mutate({ item, val })}
              />
            ))
          }
        </div>
      )}

      {/* Formulário de edição / criação */}
      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-3xl shadow-2xl border border-border w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">{editing.id ? 'Editar nível' : 'Novo nível'} — {editing.owner_type === 'prestador' ? '🔧 Prestador' : '👥 Cliente'}</h3>
              <Button size="icon" variant="ghost" onClick={() => setEditItem(null)}><X className="w-4 h-4" /></Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Nome do nível</Label>
                <Input value={editing.nivel} onChange={e => setEditItem(p => ({ ...p, nivel: e.target.value }))} placeholder="Ex: Ouro" />
              </div>

              {editing.owner_type === 'prestador' ? <>
                <div>
                  <Label className="text-xs">Mín. serviços</Label>
                  <Input type="number" value={editing.min_jobs} onChange={e => setEditItem(p => ({ ...p, min_jobs: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Máx. serviços (vazio = ilimitado)</Label>
                  <Input type="number" value={editing.max_jobs ?? ''} onChange={e => setEditItem(p => ({ ...p, max_jobs: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Avaliação mínima ★</Label>
                  <Input type="number" step="0.1" value={editing.min_rating} onChange={e => setEditItem(p => ({ ...p, min_rating: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Bônus por serviço (R$)</Label>
                  <Input type="number" step="0.01" value={editing.bonus_fixo} onChange={e => setEditItem(p => ({ ...p, bonus_fixo: e.target.value }))} />
                </div>
              </> : <>
                <div>
                  <Label className="text-xs">Mín. amigos ativos</Label>
                  <Input type="number" value={editing.min_amigos} onChange={e => setEditItem(p => ({ ...p, min_amigos: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Máx. amigos (vazio = ilimitado)</Label>
                  <Input type="number" value={editing.max_amigos ?? ''} onChange={e => setEditItem(p => ({ ...p, max_amigos: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Bônus fixo por serviço (R$)</Label>
                  <Input type="number" step="0.01" value={editing.bonus_fixo} onChange={e => setEditItem(p => ({ ...p, bonus_fixo: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">% do take do serviço</Label>
                  <Input type="number" step="0.1" value={editing.percent_take} onChange={e => setEditItem(p => ({ ...p, percent_take: e.target.value }))} />
                </div>
              </>}
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={!!editing.is_active} onCheckedChange={v => setEditItem(p => ({ ...p, is_active: v }))} />
              <Label className="text-sm">Ativo</Label>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setEditItem(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={() => save.mutate(editing)} disabled={save.isPending}>
                <Save className="w-4 h-4 mr-1" /> Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}