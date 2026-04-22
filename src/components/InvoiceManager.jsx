import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, Download, Trash2, ChevronRight, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  enviada: { label: 'Enviada', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '📤', badge: 'bg-blue-500' },
  recebida: { label: 'Recebida', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '✅', badge: 'bg-yellow-500' },
  paga: { label: 'Paga', color: 'bg-green-100 text-green-700 border-green-200', icon: '💰', badge: 'bg-green-500' },
  baixada: { label: 'Baixada', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: '📋', badge: 'bg-slate-500' },
};

export default function InvoiceManager({ providerId, providerName }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [prefillAmount, setPrefillAmount] = useState('');
  const [prefillDesc, setPrefillDesc] = useState('');
  const [formData, setFormData] = useState({
    invoice_number: '',
    amount: '',
    issue_date: '',
    description: '',
    file_url: '',
  });
  const [uploading, setUploading] = useState(false);
  const [activeClosingId, setActiveClosingId] = useState(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', providerId],
    queryFn: () => base44.entities.Invoice.filter({ provider_id: providerId }, '-created_date', 50),
    enabled: !!providerId,
  });

  const { data: closings = [] } = useQuery({
    queryKey: ['my-closings', providerId],
    queryFn: () => base44.entities.BiweeklyClosing.filter({ provider_id: providerId }, '-created_date', 20),
    enabled: !!providerId,
  });

  const linkInvoiceMutation = useMutation({
    mutationFn: ({ closingId, invoiceId }) =>
      base44.entities.BiweeklyClosing.update(closingId, { status: 'nota_enviada', invoice_id: invoiceId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-closings', providerId] });
      toast.success('Nota vinculada ao fechamento!');
    },
  });

  const pendingClosings = closings.filter(c => c.status === 'pendente_nota');

  const createInvoiceMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.Invoice.create({
        provider_id: providerId,
        provider_name: providerName,
        ...data,
        amount: parseFloat(data.amount),
      }),
    onSuccess: (newInvoice, vars) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', providerId] });
      // Se veio de um fechamento pendente, vincula automaticamente
      if (vars._closingId) {
        linkInvoiceMutation.mutate({ closingId: vars._closingId, invoiceId: newInvoice.id });
      }
      setFormData({ invoice_number: '', amount: '', issue_date: '', description: '', file_url: '' });
      setPrefillAmount('');
      setPrefillDesc('');
      setShowForm(false);
      toast.success('Nota fiscal enviada com sucesso!');
    },
    onError: () => toast.error('Erro ao enviar nota fiscal'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => {
      const updateData = { status };
      if (status === 'recebida') updateData.received_date = new Date().toISOString();
      if (status === 'paga') updateData.paid_date = new Date().toISOString();
      if (status === 'baixada') updateData.low_date = new Date().toISOString();
      return base44.entities.Invoice.update(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', providerId] });
      toast.success('Status atualizado!');
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: (id) => base44.entities.Invoice.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', providerId] });
      toast.success('Nota fiscal removida');
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, file_url }));
      toast.success('Arquivo enviado!');
    } catch (err) {
      toast.error('Erro ao fazer upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (closingId) => {
    if (!formData.invoice_number || !formData.amount || !formData.issue_date) {
      toast.error('Preencha número, valor e data');
      return;
    }
    createInvoiceMutation.mutate({ ...formData, _closingId: closingId || null });
  };

  const stats = {
    enviadas: invoices.filter(i => i.status === 'enviada').length,
    recebidas: invoices.filter(i => i.status === 'recebida').length,
    pagas: invoices.filter(i => i.status === 'paga').length,
    total: invoices.reduce((sum, i) => sum + (i.amount || 0), 0),
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-20 bg-muted rounded-2xl animate-pulse" />
        <div className="h-32 bg-muted rounded-2xl animate-pulse" />
      </div>
    );
  }

  const openFormForClosing = (closing) => {
    setActiveClosingId(closing.id);
    setFormData({
      invoice_number: '',
      amount: String(closing.net_amount),
      issue_date: new Date().toISOString().split('T')[0],
      description: `Serviços prestados no período ${closing.period_label}`,
      file_url: '',
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">

      {/* Fechamentos pendentes de nota */}
      {pendingClosings.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-foreground flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            Fechamentos aguardando sua nota fiscal
          </p>
          {pendingClosings.map(closing => (
            <motion.div
              key={closing.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-4 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-orange-900 text-sm">📅 {closing.period_label}</p>
                  <p className="text-xs text-orange-700">{closing.total_services} serviço(s) · Bruto R$ {closing.gross_amount?.toFixed(2)}</p>
                  <p className="text-xs text-orange-700">Desconto fundo (-3%): R$ {closing.reserve_fund_deduction?.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-orange-600 font-semibold">Valor a receber</p>
                  <p className="text-xl font-black text-orange-900">R$ {closing.net_amount?.toFixed(2)}</p>
                  <p className="text-[10px] text-orange-500 mt-0.5">⏱ Pago em até 5 dias úteis</p>
                </div>
              </div>
              <Button
                size="sm"
                className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs"
                onClick={() => openFormForClosing(closing)}
              >
                <Upload className="w-3 h-3 mr-1" /> Emitir nota para este fechamento
              </Button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
          <p className="text-xs text-blue-600 font-semibold">Aguardando</p>
          <p className="text-xl font-bold text-blue-900">{stats.enviadas}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-3">
          <p className="text-xs text-green-600 font-semibold">Pagas</p>
          <p className="text-xl font-bold text-green-900">{stats.pagas}</p>
        </div>
      </div>
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl p-4">
        <p className="text-xs opacity-80 font-semibold mb-1">Total em notas</p>
        <p className="text-2xl font-bold">R$ {stats.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>

      {/* Formulário */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-4 space-y-3"
        >
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Upload className="w-4 h-4" /> Nova Nota Fiscal
          </h3>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Número da NF</label>
            <Input
              placeholder="Ex: NF-2024-001"
              value={formData.invoice_number}
              onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Valor (R$)</label>
              <Input
                type="number"
                placeholder="0,00"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Data de emissão</label>
              <Input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                className="text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Descrição</label>
            <Input
              placeholder="Descrição dos serviços..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Arquivo da NF (PDF)</label>
            <div className="flex gap-2">
              <Input
                type="file"
                accept=".pdf,.jpg,.png"
                onChange={handleFileUpload}
                disabled={uploading}
                className="text-xs"
              />
              {formData.file_url && (
                <div className="flex items-center gap-1 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 font-semibold">
                  ✓ Upload ok
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 text-sm"
              onClick={() => setShowForm(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-primary text-primary-foreground font-semibold text-sm"
              onClick={() => handleSubmit(activeClosingId)}
              disabled={createInvoiceMutation.isPending}
            >
              {createInvoiceMutation.isPending ? 'Enviando...' : 'Enviar Nota'}
            </Button>
          </div>
        </motion.div>
      )}

      {!showForm && (
        <Button
          className="w-full rounded-xl bg-primary text-primary-foreground font-semibold"
          onClick={() => setShowForm(true)}
        >
          <Upload className="w-4 h-4 mr-2" /> Nova Nota Fiscal
        </Button>
      )}

      {/* Lista de notas */}
      {invoices.length === 0 ? (
        <div className="bg-card rounded-2xl p-6 border border-border text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="font-semibold text-foreground">Nenhuma nota fiscal</p>
          <p className="text-xs text-muted-foreground mt-1">Comece enviando sua primeira nota</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((invoice, idx) => {
            const config = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.enviada;
            return (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-card border border-border rounded-2xl p-3 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm">{invoice.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">{invoice.description}</p>
                  </div>
                  <span className={cn('text-xs font-bold px-2.5 py-1 rounded-lg', config.color)}>
                    {config.icon} {config.label}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <p className="font-bold text-primary">R$ {invoice.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(invoice.issue_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {/* Fluxo de status */}
                <div className="flex items-center gap-1 text-xs bg-muted rounded-lg p-2">
                  {['enviada', 'recebida', 'paga', 'baixada'].map((s, i) => (
                    <React.Fragment key={s}>
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: invoice.id, status: s })}
                        disabled={updateStatusMutation.isPending}
                        className={cn(
                          'flex-1 py-1 px-2 rounded font-semibold transition-all text-xs',
                          invoice.status === s
                            ? STATUS_CONFIG[s].color + ' border border-current'
                            : 'text-muted-foreground hover:bg-muted/80'
                        )}
                        title={`Marcar como ${STATUS_CONFIG[s].label}`}
                      >
                        {STATUS_CONFIG[s].icon}
                      </button>
                      {i < 3 && <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                    </React.Fragment>
                  ))}
                </div>

                {/* Ações */}
                <div className="flex gap-2 pt-1">
                  {invoice.file_url && (
                    <a
                      href={invoice.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-primary bg-primary/10 rounded-lg py-2 hover:bg-primary/20 transition"
                    >
                      <Download className="w-3 h-3" /> Download
                    </a>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Remover esta nota?')) {
                        deleteInvoiceMutation.mutate(invoice.id);
                      }
                    }}
                    className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-destructive bg-destructive/10 rounded-lg hover:bg-destructive/20 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}