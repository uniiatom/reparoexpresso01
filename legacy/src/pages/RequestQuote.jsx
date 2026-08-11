import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";

const BUDGETS = [
  { value: "ate_200", label: "Até R$ 200" },
  { value: "200_500", label: "R$ 200 - R$ 500" },
  { value: "500_1000", label: "R$ 500 - R$ 1.000" },
  { value: "1000_3000", label: "R$ 1.000 - R$ 3.000" },
  { value: "acima_3000", label: "Acima de R$ 3.000" },
  { value: "a_combinar", label: "A combinar" },
];

export default function RequestQuote() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const professionalId = urlParams.get('professional');

  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    category_id: '',
    category_name: '',
    professional_id: professionalId || '',
    professional_name: '',
    description: '',
    city: '',
    state: '',
    preferred_date: '',
    budget: 'a_combinar',
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    initialData: [],
  });

  const { data: professional } = useQuery({
    queryKey: ['professional', professionalId],
    queryFn: async () => {
      if (!professionalId) return null;
      const list = await base44.entities.Professional.filter({ id: professionalId });
      return list[0] || null;
    },
    enabled: !!professionalId,
  });

  React.useEffect(() => {
    if (professional) {
      setForm(prev => ({
        ...prev,
        professional_name: professional.name,
        category_name: professional.category_name || '',
        category_id: professional.category_id || '',
      }));
    }
  }, [professional]);

  const createQuote = useMutation({
    mutationFn: (data) => base44.entities.QuoteRequest.create(data),
    onSuccess: () => setSubmitted(true),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.client_name || !form.description) {
      toast.error("Por favor, preencha os campos obrigatórios");
      return;
    }
    createQuote.mutate(form);
  };

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Solicitação Enviada!</h2>
        <p className="text-muted-foreground mt-2">
          O profissional receberá sua solicitação e entrará em contato em breve.
        </p>
        <div className="flex gap-3 justify-center mt-8">
          <Button variant="outline" onClick={() => navigate('/professionals')}>
            Ver Profissionais
          </Button>
          <Button className="bg-primary text-primary-foreground" onClick={() => navigate('/')}>
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Button variant="ghost" className="mb-6 -ml-2 text-muted-foreground" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Pedir Orçamento</CardTitle>
          {professional && (
            <p className="text-muted-foreground">
              Solicitação para <span className="font-medium text-foreground">{professional.name}</span>
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  placeholder="Seu nome completo"
                  value={form.client_name}
                  onChange={(e) => updateField('client_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  placeholder="(11) 99999-9999"
                  value={form.client_phone}
                  onChange={(e) => updateField('client_phone', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={form.client_email}
                onChange={(e) => updateField('client_email', e.target.value)}
              />
            </div>

            {!professionalId && (
              <div className="space-y-2">
                <Label>Categoria do Serviço</Label>
                <Select
                  value={form.category_name}
                  onValueChange={(value) => {
                    const cat = categories.find(c => c.name === value);
                    updateField('category_name', value);
                    if (cat) updateField('category_id', cat.id);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Descreva o serviço que você precisa *</Label>
              <Textarea
                placeholder="Descreva detalhes do serviço, incluindo tamanho do projeto, urgência, etc."
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  placeholder="Sua cidade"
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input
                  placeholder="Ex: SP"
                  value={form.state}
                  onChange={(e) => updateField('state', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Preferida</Label>
                <Input
                  type="date"
                  value={form.preferred_date}
                  onChange={(e) => updateField('preferred_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Orçamento Estimado</Label>
                <Select value={form.budget} onValueChange={(v) => updateField('budget', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGETS.map(b => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base"
              disabled={createQuote.isPending}
            >
              {createQuote.isPending ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Solicitação
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}