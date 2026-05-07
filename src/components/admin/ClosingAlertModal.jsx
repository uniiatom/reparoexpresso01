import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { X, AlertCircle, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function ClosingAlertModal({ closing, onClose }) {
  const [sendingAlert, setSendingAlert] = useState(false);
  const [alertSent, setAlertSent] = useState(false);

  const handleSendAlert = async () => {
    setSendingAlert(true);
    try {
      // Envia notificação ao prestador sobre o valor a pagar
      await base44.functions.invoke('sendClosingAlert', {
        provider_id: closing.provider_id,
        provider_name: closing.provider_name,
        net_amount: closing.net_amount,
        period_label: closing.period_label,
        total_services: closing.total_services,
        closing_id: closing.id,
      });
      
      setAlertSent(true);
      toast.success('Alerta enviado ao prestador!');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      toast.error('Erro ao enviar alerta: ' + error.message);
    } finally {
      setSendingAlert(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
      >
        {/* Header */}
        <div className="bg-blue-50 border-b border-blue-200 p-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg">Fechamento Gerado</h2>
              <p className="text-xs text-muted-foreground mt-1">Valor total a pagar ao prestador</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-blue-100 rounded-lg transition">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Prestador Info */}
          <div className="bg-card rounded-xl p-4 border border-border space-y-2">
            <p className="text-xs text-muted-foreground font-semibold uppercase">Prestador</p>
            <p className="font-bold text-foreground text-lg">{closing.provider_name}</p>
            <p className="text-sm text-muted-foreground">{closing.period_label}</p>
          </div>

          {/* Valor Destaque */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center space-y-1">
            <p className="text-xs text-green-600 font-semibold uppercase">Valor Total Líquido</p>
            <p className="text-4xl font-bold text-green-700">
              R$ {(closing.net_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-green-600 mt-2">
              {closing.total_services} serviço(s)
            </p>
          </div>

          {/* Info Text */}
          {!alertSent && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>O prestador receberá um alerta</strong> sobre o valor que precisa emitir em nota fiscal. Você pode enviar agora ou fazer isso manualmente depois.
              </p>
            </div>
          )}

          {alertSent && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs text-green-700 font-semibold">
                ✓ Alerta enviado com sucesso!
              </p>
              <p className="text-xs text-green-600 mt-1">
                O prestador foi notificado do valor que deve emitir em nota.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-xl"
            disabled={sendingAlert}
          >
            {alertSent ? 'Fechar' : 'Depois'}
          </Button>
          {!alertSent && (
            <Button
              onClick={handleSendAlert}
              disabled={sendingAlert}
              className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {sendingAlert ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Alerta
                </>
              )}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}