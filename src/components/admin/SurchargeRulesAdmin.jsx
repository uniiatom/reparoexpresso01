import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Save, Trash2, Plus, Clock, Calendar, Star, Edit2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

const RULE_TYPES = [
  { value: 'time_range', label: 'Faixa de Horário', icon: Clock, desc: 'Ex: após 22h, antes das 6h' },
  { value: 'day_of_week', label: 'Dia da Semana', icon: Calendar, desc: 'Ex: Domingos, Sábados' },
  { value: 'holiday', label: 'Feriado', icon: Star, desc: 'Aplicado manualmente ou em datas fixas' },
];

const EMPTY_FORM = {
  name: '',
  rule_type: 'time_range',
  days_of_week: [],
  time_start: '22:00',
  time_end: '06:00',
  surcharge_percent: 30,
  applies_to_all_services: true,
  is_active: true,
  description: '',
};

export default function SurchargeRulesAdmin() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['surcharge-rules'],
    queryFn: () => base44.entities.SurchargeRule.list('-created_date', 100),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editingId
      ? base44.entities.SurchargeRule.update(editingId, data)
      : base44.entities.SurchargeRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surcharge-rules'] });
      setEditingId(null);
      setShowForm(false);
      setForm(EMPTY_FORM);
      toast.success(editingId ? 'Regra atualizada' : 'Regra criada');
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SurchargeRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surcharge-rules'] });
      toast.success('Regra removida');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.SurchargeRule.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surcharge-rules'] }),
  });

  const handleEdit = (rule) => {
    setEditingId(rule.id);
    setForm({
      name: rule.name || '',
      rule_type: rule.rule_type || 'time_range',
      days_of_week: rule.days_of_week || [],
      time_start: rule.time_start || '22:00',
      time_end: rule.time_end || '06:00',
      surcharge_percent: rule.surcharge_percent || 30,
      applies_to_all_services: rule.applies_to_all_services !== false,
      is_active: rule.is_active !== false,
      description: rule.description || '',
    });
    setShowForm(true);
  };

  const toggleDay = (day) => {
    setForm(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.surcharge_percent) {
      toast.error('Preencha o nome e o percentual');
      return;
    }
    saveMutation.mutate({
      ...form,
      surcharge_percent: parseFloat(form.surcharge_percent),
    });
  };

  const getRuleLabel = (rule) => {
    if (rule.rule_type === 'holiday') return 'Feriado';
    if (rule.rule_type === 'day_of_week') {
      const dayNames = (rule.days_of_week || []).map(d => DAYS.find(x => x.value === d)?.label).filter(Boolean);
      return dayNames.join(', ') || 'Sem dias';
    }
    if (rule.rule_type === 'time_range') {
      const days = (rule.days_of_week || []).map(d => DAYS.find(x => x.value === d)?.label).filter(Boolean);
      const time = `${rule.time_start || '?'} – ${rule.time_end || '?'}`;
      return days.length ? `${days.join(', ')} · ${time}` : time;
    }
    return '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Sobretaxas por Horário e Dia</h3>
          <p className="text-sm text-muted-foreground">Configure percentuais adicionais para domingos, feriados, horário noturno, etc.</p>
        </div>
        {!showForm && (
          <Button onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); }} className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> Nova Regra
          </Button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-foreground">{editingId ? 'Editar Regra' : 'Nova Regra de Sobretaxa'}</h4>
              <button onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nome */}
              <div className="space-y-2">
                <Label>Nome da regra *</Label>
                <Input
                  placeholder="Ex: Noturno após 22h, Domingo, Feriado Nacional"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="rounded-xl"
                />
              </div>

              {/* Tipo de regra */}
              <div className="space-y-2">
                <Label>Tipo de regra *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {RULE_TYPES.map(rt => {
                    const Icon = rt.icon;
                    return (
                      <button
                        key={rt.value}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, rule_type: rt.value }))}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all",
                          form.rule_type === rt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                        )}
                      >
                        <Icon className={cn("w-5 h-5", form.rule_type === rt.value ? "text-primary" : "text-muted-foreground")} />
                        <p className={cn("font-semibold text-xs", form.rule_type === rt.value ? "text-primary" : "text-foreground")}>{rt.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{rt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dias da semana (para day_of_week e time_range) */}
              {(form.rule_type === 'day_of_week' || form.rule_type === 'time_range') && (
                <div className="space-y-2">
                  <Label>
                    {form.rule_type === 'day_of_week' ? 'Dias da semana *' : 'Restringir a dias específicos (opcional)'}
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    {DAYS.map(day => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        className={cn(
                          "w-10 h-10 rounded-xl text-xs font-bold transition-all border-2",
                          form.days_of_week.includes(day.value)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:border-primary/40"
                        )}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  {form.rule_type === 'time_range' && form.days_of_week.length === 0 && (
                    <p className="text-xs text-muted-foreground">Sem dias selecionados = aplica todos os dias</p>
                  )}
                </div>
              )}

              {/* Faixa de horário */}
              {form.rule_type === 'time_range' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Horário início *</Label>
                    <Input
                      type="time"
                      value={form.time_start}
                      onChange={e => setForm(p => ({ ...p, time_start: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Horário fim *</Label>
                    <Input
                      type="time"
                      value={form.time_end}
                      onChange={e => setForm(p => ({ ...p, time_end: e.target.value }))}
                      className="rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground">Se menor que início, entende que passa da meia-noite</p>
                  </div>
                </div>
              )}

              {/* Percentual */}
              <div className="space-y-2">
                <Label>Percentual de sobretaxa (%) *</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="1"
                    max="500"
                    value={form.surcharge_percent}
                    onChange={e => setForm(p => ({ ...p, surcharge_percent: e.target.value }))}
                    className="rounded-xl w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    → preço base × {(1 + parseFloat(form.surcharge_percent || 0) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[20, 30, 40, 50, 70, 100].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, surcharge_percent: p }))}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-semibold border transition-all",
                        parseFloat(form.surcharge_percent) === p
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-foreground border-border hover:border-primary/40"
                      )}
                    >
                      +{p}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label>Observação (opcional)</Label>
                <Input
                  placeholder="Ex: Aplica-se em serviços solicitados após 22h"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={saveMutation.isPending} className="flex-1 rounded-xl">
                  <Save className="w-4 h-4 mr-2" />
                  {saveMutation.isPending ? 'Salvando...' : 'Salvar Regra'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de regras */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
      ) : rules.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-10 text-center">
          <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold text-foreground">Nenhuma regra configurada</p>
          <p className="text-sm text-muted-foreground mt-1">Adicione sobretaxas para domingos, feriados, horário noturno, etc.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => {
            const RuleIcon = RULE_TYPES.find(r => r.value === rule.rule_type)?.icon || Clock;
            return (
              <Card key={rule.id} className={cn("transition-opacity", !rule.is_active && "opacity-60")}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        rule.is_active ? "bg-primary/10" : "bg-muted"
                      )}>
                        <RuleIcon className={cn("w-5 h-5", rule.is_active ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground">{rule.name}</p>
                          <Badge className={cn(
                            "text-xs font-bold",
                            rule.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            +{rule.surcharge_percent}%
                          </Badge>
                          {!rule.is_active && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">Inativo</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{getRuleLabel(rule)}</p>
                        {rule.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">{rule.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={rule.is_active !== false}
                        onCheckedChange={(val) => toggleMutation.mutate({ id: rule.id, is_active: val })}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => handleEdit(rule)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                        onClick={() => deleteMutation.mutate(rule.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}