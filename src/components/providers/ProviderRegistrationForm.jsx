import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
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
import { Loader2, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PROVIDER_SERVICE_TYPES, WEEKDAYS } from '@/lib/constants/providerServiceTypes';
import {
  DEFAULT_PROVIDER_FORM,
  registerProvider,
  validateProviderForm,
} from '@/lib/providerRegistration';

export default function ProviderRegistrationForm({
  mode = 'self',
  userId,
  onSuccess,
  onCancel,
  className,
}) {
  const isAdmin = mode === 'admin';
  const [form, setForm] = useState({ ...DEFAULT_PROVIDER_FORM });
  const [autoApprove, setAutoApprove] = useState(false);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const setSchedule = (field, value) =>
    setForm((prev) => ({ ...prev, schedule: { ...prev.schedule, [field]: value } }));

  const toggleDay = (day) => {
    setForm((prev) => {
      const days = prev.schedule.days.includes(day)
        ? prev.schedule.days.filter((d) => d !== day)
        : [...prev.schedule.days, day].sort((a, b) => a - b);
      return { ...prev, schedule: { ...prev.schedule, days } };
    });
  };

  const updateOffering = (index, field, value) => {
    setForm((prev) => {
      const next = [...prev.serviceOfferings];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, serviceOfferings: next };
    });
  };

  const addOffering = () => {
    setForm((prev) => ({
      ...prev,
      serviceOfferings: [...prev.serviceOfferings, { serviceType: '', hourlyRate: '' }],
    }));
  };

  const removeOffering = (index) => {
    setForm((prev) => ({
      ...prev,
      serviceOfferings: prev.serviceOfferings.filter((_, i) => i !== index),
    }));
  };

  const submit = useMutation({
    mutationFn: async () => {
      const { errors } = validateProviderForm(form, { mode: isAdmin ? 'admin' : 'self' });
      if (errors.length) throw new Error(errors[0]);
      return registerProvider({
        form,
        userId,
        autoApprove: isAdmin && autoApprove,
        mode: isAdmin ? 'admin' : 'self',
      });
    },
    onSuccess: (provider) => {
      toast.success(
        isAdmin
          ? 'Prestador cadastrado com sucesso!'
          : 'Cadastro enviado! Aguarde a análise da equipe.',
      );
      setForm({ ...DEFAULT_PROVIDER_FORM });
      onSuccess?.(provider);
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao cadastrar prestador.');
    },
  });

  return (
    <div className={cn('space-y-4', className)}>
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dados do prestador</CardTitle>
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
            <Label>E-mail</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="email@exemplo.com"
              className="rounded-xl"
            />
          </div>
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
              className="rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Qualificações *</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Certificações, cursos e habilidades *</Label>
            <Textarea
              value={form.qualifications}
              onChange={(e) => set('qualifications', e.target.value)}
              placeholder="Ex.: Curso SENAI Elétrica, NR-10, homologação Escola Prática..."
              className="rounded-xl min-h-[90px]"
            />
          </div>
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
            <Label>Observações (opcional)</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => set('bio', e.target.value)}
              placeholder="Ferramentas, diferenciais, regiões que atende..."
              className="rounded-xl min-h-[70px]"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Serviços e preço por hora *</CardTitle>
          <Button type="button" size="sm" variant="outline" className="rounded-xl h-8" onClick={addOffering}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.serviceOfferings.map((offering, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2 items-end">
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
                    {PROVIDER_SERVICE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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
                  placeholder="80.00"
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

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Horário de atendimento *</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block">Dias da semana</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => {
                const active = form.schedule.days.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors',
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground',
                    )}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input
                type="time"
                value={form.schedule.startTime}
                onChange={(e) => setSchedule('startTime', e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fim</Label>
              <Input
                type="time"
                value={form.schedule.endTime}
                onChange={(e) => setSchedule('endTime', e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Máx. serviços/dia</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={form.schedule.maxSlotsPerDay}
                onChange={(e) => setSchedule('maxSlotsPerDay', e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {!isAdmin && (
        <button
          type="button"
          onClick={() => set('acceptsHomologation', !form.acceptsHomologation)}
          className={cn(
            'w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all',
            form.acceptsHomologation ? 'border-primary bg-primary/5' : 'border-border',
          )}
        >
          <div className={cn(
            'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
            form.acceptsHomologation ? 'bg-primary border-primary' : 'border-muted-foreground',
          )}>
            {form.acceptsHomologation && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
          </div>
          <p className="text-sm text-foreground">
            Entendo que passarei pelo <strong>teste de homologação na Escola Prática</strong> antes de receber chamados.
          </p>
        </button>
      )}

      {isAdmin && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <Checkbox checked={autoApprove} onCheckedChange={(v) => setAutoApprove(Boolean(v))} />
          Aprovar prestador imediatamente após cadastro
        </label>
      )}

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="outline" className="rounded-xl h-11 flex-1" onClick={onCancel}>
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
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
          ) : isAdmin ? (
            'Cadastrar prestador'
          ) : (
            'Enviar cadastro'
          )}
        </Button>
      </div>
    </div>
  );
}
