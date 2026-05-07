import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Package, Calendar, AlertCircle, Zap } from "lucide-react";

export default function ServiceCompletionModal({ open, onClose, onComplete, serviceType }) {
  const [showPartDeadlineAlert, setShowPartDeadlineAlert] = useState(false);
  const [showTechVisitReason, setShowTechVisitReason] = useState(false);
  const [showPressurizadorFeasibility, setShowPressurizadorFeasibility] = useState(false);
  const [techVisitReason, setTechVisitReason] = useState('');
  const [pressurizadorFeasible, setPressurizadorFeasible] = useState(null);
  const [pressurizadorReason, setPressurizadorReason] = useState('');
  const [selectedParts, setSelectedParts] = useState({});

  const PRESSURIZADOR_PARTS = [
    { id: 'pressostato', label: 'Pressostato', price: 150 },
    { id: 'relé', label: 'Relé de Proteção', price: 120 },
    { id: 'tubulação', label: 'Tubulação/Encanamento', price: 200 },
    { id: 'bomba', label: 'Bomba Pressurizadora', price: 500 },
    { id: 'tanque', label: 'Tanque de Pressurização', price: 800 },
    { id: 'valvula', label: 'Válvula de Retenção', price: 180 },
  ];

  const handlePartCompletion = () => {
    setShowPartDeadlineAlert(true);
  };

  const handleConfirmPartDeadline = () => {
    onComplete('em_espera');
    setShowPartDeadlineAlert(false);
    onClose();
  };

  const handleTechVisitCompletion = () => {
    // Se for pressurizador, vai pra tela de viabilidade
    if (serviceType === 'pressurizador') {
      setShowPressurizadorFeasibility(true);
    } else {
      setShowTechVisitReason(true);
    }
  };

  const handleConfirmTechVisit = () => {
    if (techVisitReason.trim().length > 5) {
      onComplete('visita_tecnica', { reason: techVisitReason });
      setShowTechVisitReason(false);
      setTechVisitReason('');
      onClose();
    }
  };

  const handleConfirmPressurizadorFeasibility = () => {
    if (pressurizadorFeasible === null || pressurizadorReason.trim().length < 10) {
      return;
    }
    const selectedPartsList = Object.entries(selectedParts)
      .filter(([_, selected]) => selected)
      .map(([id]) => PRESSURIZADOR_PARTS.find(p => p.id === id)?.label);
    
    onComplete('concluido', { 
      pressurizadorFeasible,
      reason: pressurizadorReason,
      parts: selectedPartsList
    });
    setShowPressurizadorFeasibility(false);
    setPressurizadorReason('');
    setSelectedParts({});
    onClose();
  };

  // Alerta de deadline de 15 dias para compra de peça
  if (showPartDeadlineAlert) {
    return (
      <Dialog open={open} onOpenChange={() => {
        setShowPartDeadlineAlert(false);
        onClose();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              Prazo de 15 dias
            </DialogTitle>
            <DialogDescription>
              Informação importante sobre o retorno
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="text-sm text-blue-900 font-semibold mb-2">⏰ Prazo para retorno:</p>
              <p className="text-xs text-blue-800 leading-relaxed">
                O cliente tem até <strong>15 dias</strong> para adquirir a peça e solicitar o retorno do prestador. Após este período, o atendimento será finalizado automaticamente.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-sm text-amber-900 font-semibold mb-2">📋 O que fazer:</p>
              <ul className="text-xs text-amber-800 space-y-1">
                <li>• Cliente compra a peça/material</li>
                <li>• Cliente solicita retorno</li>
                <li>• Você retorna para instalar</li>
              </ul>
            </div>

            <Button
              onClick={handleConfirmPartDeadline}
              className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Entendi, finalizar com prazo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Modal para informar motivo da visita técnica
  if (showTechVisitReason) {
    return (
      <Dialog open={open} onOpenChange={() => {
        setShowTechVisitReason(false);
        onClose();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Por que a visita técnica é necessária?</DialogTitle>
            <DialogDescription>
              Descreva brevemente o motivo da necessidade de agendamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              value={techVisitReason}
              onChange={(e) => setTechVisitReason(e.target.value)}
              placeholder="Ex: Necessário trazer ferramental específico, problema mais complexo que o previsto, aguardando peça especial..."
              className="rounded-2xl min-h-[100px]"
            />

            {techVisitReason.trim().length < 6 && techVisitReason.length > 0 && (
              <p className="text-xs text-orange-500">Descreva com mais detalhes o motivo</p>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowTechVisitReason(false);
                  onClose();
                }}
                variant="outline"
                className="flex-1 rounded-2xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmTechVisit}
                disabled={techVisitReason.trim().length < 6}
                className="flex-1 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-semibold"
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Modal de viabilidade para pressurizador
  if (showPressurizadorFeasibility) {
    return (
      <Dialog open={open} onOpenChange={() => {
        setShowPressurizadorFeasibility(false);
        onClose();
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Viabilidade para Instalação
            </DialogTitle>
            <DialogDescription>
              Avalie se é possível instalar o pressurizador neste local
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Botões viabilidade */}
            <div className="flex gap-2">
              <button
                onClick={() => setPressurizadorFeasible(true)}
                className={`flex-1 p-3 rounded-xl border-2 transition-all text-center ${
                  pressurizadorFeasible === true 
                    ? 'bg-green-50 border-green-400'
                    : 'border-border hover:border-green-300'
                }`}
              >
                <span className="text-2xl block mb-1">✓</span>
                <span className="text-sm font-semibold text-foreground">Viável</span>
              </button>
              <button
                onClick={() => setPressurizadorFeasible(false)}
                className={`flex-1 p-3 rounded-xl border-2 transition-all text-center ${
                  pressurizadorFeasible === false
                    ? 'bg-red-50 border-red-400'
                    : 'border-border hover:border-red-300'
                }`}
              >
                <span className="text-2xl block mb-1">✗</span>
                <span className="text-sm font-semibold text-foreground">Não Viável</span>
              </button>
            </div>

            {/* Se viável, mostrar lista de peças */}
            {pressurizadorFeasible === true && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-3 space-y-2">
                <p className="text-xs font-bold text-green-900 mb-2">Peças necessárias para instalação:</p>
                <div className="space-y-2">
                  {PRESSURIZADOR_PARTS.map(part => (
                    <label key={part.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-green-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedParts[part.id] || false}
                        onChange={(e) => setSelectedParts(prev => ({ ...prev, [part.id]: e.target.checked }))}
                        className="w-4 h-4 rounded cursor-pointer"
                      />
                      <span className="flex-1 text-xs font-medium text-green-900">{part.label}</span>
                      <span className="text-xs text-green-700">R$ {part.price}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Motivo/Observação */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                {pressurizadorFeasible === true ? 'Observações da instalação:' : 'Por que não é viável?'}
              </label>
              <Textarea
                value={pressurizadorReason}
                onChange={(e) => setPressurizadorReason(e.target.value)}
                placeholder={pressurizadorFeasible === true
                  ? 'Ex: Pressão da água adequada, espaço suficiente...'
                  : 'Ex: Pressão muito baixa, sem acesso de rede...'
                }
                className="rounded-xl min-h-[80px]"
              />
              {pressurizadorReason.trim().length < 10 && pressurizadorReason.length > 0 && (
                <p className="text-xs text-orange-500 mt-1">Descreva com mais detalhes</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowPressurizadorFeasibility(false);
                  onClose();
                }}
                variant="outline"
                className="flex-1 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmPressurizadorFeasibility}
                disabled={pressurizadorFeasible === null || pressurizadorReason.trim().length < 10}
                className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Modal principal de conclusão
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Como finalizar este atendimento?</DialogTitle>
          <DialogDescription>
            Escolha a opção que melhor descreve o resultado do serviço
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <button
            onClick={() => {
              onComplete('concluido');
              onClose();
            }}
            className="w-full p-3 rounded-xl border-2 border-green-200 hover:bg-green-50 transition-colors text-left"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-700">Finalizar com Sucesso</p>
                <p className="text-xs text-green-600">Serviço concluído normalmente</p>
              </div>
            </div>
          </button>

          <button
            onClick={handlePartCompletion}
            className="w-full p-3 rounded-xl border-2 border-blue-200 hover:bg-blue-50 transition-colors text-left"
          >
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-700">Necessário Peça</p>
                <p className="text-xs text-blue-600">Cliente precisa adquirir peça/material</p>
              </div>
            </div>
          </button>

          <button
            onClick={handleTechVisitCompletion}
            className="w-full p-3 rounded-xl border-2 border-orange-200 hover:bg-orange-50 transition-colors text-left"
          >
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-700">{serviceType === 'pressurizador' ? 'Avaliar Viabilidade' : 'Visita Técnica'}</p>
                <p className="text-xs text-orange-600">{serviceType === 'pressurizador' ? 'Verificar se é possível instalar' : 'Agendamento necessário para continuação'}</p>
              </div>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}