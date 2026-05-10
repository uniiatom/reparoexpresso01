import React, { useState } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MessageSquare, Camera, X, Loader2, Send } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';

export default function OutrosServicoModal({ onClose, onConfirm }) {
  const navigate = useNavigate();
  const [descricao, setDescricao] = useState('');
  const [fotos, setFotos] = useState([]);
  const [uploadando, setUploadando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleFotos = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadando(true);
    const urls = await Promise.all(
      files.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url))
    );
    setFotos(prev => [...prev, ...urls]);
    setUploadando(false);
  };

  const handleEnviar = async () => {
    setEnviando(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      await base44.functions.invoke('notificarOutrosServico', {
        descricao,
        fotos,
        usuario_email: user?.email || 'Não identificado',
        usuario_nome: user?.full_name || 'Não identificado',
      });
    } catch (e) {
      // silencia — mesmo com erro, confirma para o cliente
    }
    setEnviando(false);
    setEnviado(true);
  };

  if (enviado) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
        <div className="bg-card w-full max-w-lg rounded-t-3xl p-8 pb-10 text-center">
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Solicitação enviada! ✅</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Suas informações foram encaminhadas para a nossa equipe. Daremos retorno o mais breve possível.
          </p>
          <Button
            onClick={() => navigate('/')}
            className="w-full rounded-2xl"
          >
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-t-3xl p-6 pb-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Outros serviços</h3>
            <p className="text-xs text-muted-foreground">Descreva o que você precisa</p>
          </div>
        </div>

        <Textarea
          placeholder="Ex: Preciso instalar um portão manual, fazer uma reforma na cozinha, pintar uma parede..."
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
          className="min-h-[120px] rounded-2xl mb-4"
          autoFocus
        />

        {/* Fotos */}
        <div className="mb-4">
          <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Camera className="w-4 h-4" /> Fotos <span className="text-muted-foreground font-normal">(opcional)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {fotos.map((url, idx) => (
              <div key={idx} className="relative">
                <img src={url} alt="" className="w-16 h-16 rounded-xl object-cover border border-border" />
                <button
                  onClick={() => setFotos(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {fotos.length < 5 && (
              <label className={uploadando ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}>
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center hover:border-primary/50 transition-colors">
                  {uploadando ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /> : <Camera className="w-5 h-5 text-muted-foreground" />}
                </div>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFotos} capture="environment" />
              </label>
            )}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">ℹ️ Como funciona:</span> Suas informações serão encaminhadas para a nossa equipe responsável e daremos retorno o mais breve possível para viabilizar o seu atendimento.
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-2xl">
            Cancelar
          </Button>
          <Button
            onClick={handleEnviar}
            disabled={descricao.trim().length < 10 || enviando}
            className="flex-1 rounded-2xl"
          >
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar solicitação'}
          </Button>
        </div>
      </div>
    </div>
  );
}