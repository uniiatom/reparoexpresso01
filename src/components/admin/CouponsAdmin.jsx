import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Cond.", outros: "Outros",
};

function CouponForm({ coupon, providers, onSubmit, onCancel }) {
  const [form, setForm] = useState(coupon || {
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 0,
    min_amount: 0,
    max_discount_amount: null,
    max_uses: null,
    valid_from: '',
    valid_until: '',
    is_active: true,
    service_types: [],
    applicable_to_providers: [],
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.code || !form.discount_value || form.discount_value <= 0) {
      toast.error('Preencha código e valor do desconto');
      return;
    }
    onSubmit(form);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-base">{coupon ? 'Editar Cupom' : 'Novo Cupom'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1">Código *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="EX: SUMMER2024"
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1">Tipo de Desconto *</label>
              <select
                value={form.discount_type}
                onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="percentage">Percentual (%)</option>
                <option value="fixed">Valor Fixo (R$)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1">
                Valor do Desconto {form.discount_type === 'percentage' ? '(%)' : '(R$)'} *
              </label>
              <input
                type="number"
                value={form.discount_value || ''}
                onChange={(e) => setForm({ ...form, discount_value: e.target.value ? parseFloat(e.target.value) : 0 })}
                min="0.1"
                step={form.discount_type === 'percentage' ? '0.1' : '0.01'}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1">Valor Mínimo (R$)</label>
              <input
                type="number"
                value={form.min_amount}
                onChange={(e) => setForm({ ...form, min_amount: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {form.discount_type === 'percentage' && (
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1">Desconto Máximo (R$)</label>
              <input
                type="number"
                value={form.max_discount_amount || ''}
                onChange={(e) => setForm({ ...form, max_discount_amount: parseFloat(e.target.value) || null })}
                min="0"
                step="0.01"
                placeholder="Deixe em branco para sem limite"
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-foreground block mb-1">Descrição</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Desconto de verão"
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1">Válido De</label>
              <input
                type="date"
                value={form.valid_from}
                onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1">Válido Até</label>
              <input
                type="date"
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground block mb-1">Número Máximo de Usos</label>
            <input
              type="number"
              value={form.max_uses || ''}
              onChange={(e) => setForm({ ...form, max_uses: e.target.value ? parseInt(e.target.value) : null })}
              min="0"
              placeholder="Deixe em branco para ilimitado"
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-input"
            />
            <label htmlFor="active" className="text-sm font-medium text-foreground cursor-pointer">
              Cupom ativo
            </label>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 rounded-xl">
              {coupon ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function CouponsAdmin() {
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const queryClient = useQueryClient();

  const { data: coupons = [] } = useQuery({
    queryKey: ['coupons'],
    queryFn: () => base44.asServiceRole.entities.Coupon.list('-created_date', 100),
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['all-providers-coupons'],
    queryFn: () => base44.asServiceRole.entities.Provider.list(),
  });

  const createCoupon = useMutation({
    mutationFn: (data) => base44.asServiceRole.entities.Coupon.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Cupom criado com sucesso');
      setShowForm(false);
    },
  });

  const updateCoupon = useMutation({
    mutationFn: ({ id, data }) => base44.asServiceRole.entities.Coupon.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Cupom atualizado');
      setEditingCoupon(null);
    },
  });

  const deleteCoupon = useMutation({
    mutationFn: (id) => base44.asServiceRole.entities.Coupon.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Cupom removido');
    },
  });

  const handleSubmit = (form) => {
    if (editingCoupon) {
      updateCoupon.mutate({ id: editingCoupon.id, data: form });
    } else {
      createCoupon.mutate(form);
    }
  };

  const copyCouponCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!');
  };

  const isExpired = (coupon) => {
    if (!coupon.valid_until) return false;
    return new Date().toISOString().split('T')[0] > coupon.valid_until;
  };

  const isNotStarted = (coupon) => {
    if (!coupon.valid_from) return false;
    return new Date().toISOString().split('T')[0] < coupon.valid_from;
  };

  const isExhausted = (coupon) => coupon.max_uses && coupon.current_uses >= coupon.max_uses;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Cupons de Desconto</h2>
        {!showForm && !editingCoupon && (
          <Button
            onClick={() => setShowForm(true)}
            className="rounded-xl gap-2"
          >
            <Plus className="w-4 h-4" /> Novo Cupom
          </Button>
        )}
      </div>

      {(showForm || editingCoupon) && (
        <CouponForm
          coupon={editingCoupon}
          providers={providers}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingCoupon(null);
          }}
        />
      )}

      <div className="grid gap-3">
        {coupons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum cupom criado ainda
          </div>
        ) : (
          coupons.map(coupon => (
            <Card key={coupon.id} className="border-border overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-lg text-primary">{coupon.code}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => copyCouponCode(coupon.code)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    {coupon.description && (
                      <p className="text-sm text-muted-foreground mb-2">{coupon.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-primary/10 text-primary border-0">
                        {coupon.discount_type === 'percentage'
                          ? `${coupon.discount_value}% OFF`
                          : `R$ ${coupon.discount_value.toFixed(2)}`}
                      </Badge>
                      {coupon.min_amount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          Mín: R$ {coupon.min_amount.toFixed(2)}
                        </Badge>
                      )}
                      {coupon.max_uses && (
                        <Badge variant="outline" className="text-xs">
                          {coupon.current_uses}/{coupon.max_uses} usos
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {coupon.is_active && !isExpired(coupon) && !isNotStarted(coupon) && !isExhausted(coupon) ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1 mb-3">
                  {coupon.valid_from && <p>Válido de: {new Date(coupon.valid_from).toLocaleDateString('pt-BR')}</p>}
                  {coupon.valid_until && <p>Válido até: {new Date(coupon.valid_until).toLocaleDateString('pt-BR')}</p>}
                </div>

                {isExpired(coupon) && <p className="text-xs text-red-600 font-semibold mb-2">❌ Cupom expirado</p>}
                {isNotStarted(coupon) && <p className="text-xs text-yellow-600 font-semibold mb-2">⏳ Cupom não iniciado</p>}
                {isExhausted(coupon) && <p className="text-xs text-red-600 font-semibold mb-2">❌ Limite de usos atingido</p>}
                {!coupon.is_active && <p className="text-xs text-gray-600 font-semibold mb-2">⊘ Cupom desativado</p>}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-xl h-8"
                    onClick={() => setEditingCoupon(coupon)}
                  >
                    <Edit2 className="w-3 h-3 mr-1" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-xl h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => deleteCoupon.mutate(coupon.id)}
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Remover
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}