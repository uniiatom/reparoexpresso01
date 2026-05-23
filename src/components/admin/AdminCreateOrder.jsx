import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, MapPin, User, Phone, Briefcase } from "lucide-react";
import { toast } from "sonner";

const SERVICE_TYPES = [
  { value: 'eletrica', label: 'Elétrica' },
  { value: 'hidraulica', label: 'Hidráulica' },
  { value: 'fechadura', label: 'Fechadura' },
  { value: 'ar_condicionado', label: 'Ar Condicionado' },
  { value: 'limpeza_caixa_dagua', label: "Limpeza Caixa d'Água" },
  { value: 'desentupimento', label: 'Desentupimento' },
  { value: 'pintura', label: 'Pintura' },
  { value: 'reparo_geral', label: 'Reparo Geral' },
  { value: 'reboque', label: 'Reboque' },
  { value: 'outros', label: 'Outros' },
];

export default function AdminCreateOrder() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    client_name: '',
    client_phone: '',
    service_type: '',
    description: '',
    address: '',
    city: '',
    modality: 'imediato',
    scheduled_date: '',
    scheduled_time: '',
  });

  const createRequest = useMutation({
    mutationFn: async (data) => {
      // Basic validation
      if (!data.client_name || !data.client_phone || !data.service_type || !data.address) {
        throw new Error("Preencha todos os campos obrigatórios.");
      }

      const payload = {
        ...data,
        status: 'aguardando',
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      };

      const result = await base44.entities.ServiceRequest.create(payload);
      
      // Generate passwords
      try {
        await base44.functions.invoke('generateServicePasswords', { request_id: result.id });
      } catch (e) {
        console.warn('Password generation error:', e);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-requests'] });
      toast.success("Pedido criado com sucesso!");
      setForm({
        client_name: '',
        client_phone: '',
        service_type: '',
        description: '',
        address: '',
        city: '',
        modality: 'imediato',
        scheduled_date: '',
        scheduled_time: '',
      });
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao criar pedido.");
    }
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" /> Cadastrar Novo Pedido (Admin)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="client_name">Nome do Cliente *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="client_name"
                placeholder="Nome completo"
                className="pl-10 rounded-xl"
                value={form.client_name}
                onChange={e => handleChange('client_name', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client_phone">WhatsApp / Telefone *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="client_phone"
                placeholder="(00) 00000-0000"
                className="pl-10 rounded-xl"
                value={form.client_phone}
                onChange={e => handleChange('client_phone', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="service_type">Tipo de Serviço *</Label>
          <Select value={form.service_type} onValueChange={v => handleChange('service_type', v)}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Selecione o serviço" />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição do Problema</Label>
          <Textarea
            id="description"
            placeholder="Detalhes sobre o que precisa ser feito..."
            className="rounded-xl min-h-[100px]"
            value={form.description}
            onChange={e => handleChange('description', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="address">Endereço Completo *</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="address"
                placeholder="Rua, número, bairro"
                className="pl-10 rounded-xl"
                value={form.address}
                onChange={e => handleChange('address', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              placeholder="Cidade"
              className="rounded-xl"
              value={form.city}
              onChange={e => handleChange('city', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <Label>Modalidade</Label>
            <Select value={form.modality} onValueChange={v => handleChange('modality', v)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="imediato">⚡ Imediato</SelectItem>
                <SelectItem value="agendado">📅 Agendado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.modality === 'agendado' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  className="rounded-xl"
                  value={form.scheduled_date}
                  onChange={e => handleChange('scheduled_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  className="rounded-xl"
                  value={form.scheduled_time}
                  onChange={e => handleChange('scheduled_time', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="pt-4">
          <Button
            onClick={() => createRequest.mutate(form)}
            disabled={createRequest.isPending}
            className="w-full h-12 rounded-xl text-base font-bold"
          >
            {createRequest.isPending ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Criando...</>
            ) : (
              "Criar Pedido"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
