import React from 'react';

/**
 * Modais de alerta para serviços que precisam informar o cliente antes de confirmar.
 * Inclui: Pane Seca, Limpeza de Telhado
 */

export function PaneSeccaAlertModal({ onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-t-3xl p-6 pb-8" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
        <div className="text-center mb-5">
          <span className="text-4xl mb-3 block">⛽</span>
          <h3 className="text-lg font-bold text-foreground mb-2">Pane Seca - Importante</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Informações sobre o serviço de pane seca:
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-left space-y-3">
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">🛢️ Gasolina fornecida</p>
              <p className="text-xs text-blue-800">Fornecemos 5 litros de gasolina aditivada</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">🧾 Comprovante fiscal</p>
              <p className="text-xs text-blue-800">Entregamos o cupom fiscal do combustível ao cliente</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">⚠️ Responsabilidade da gasolina</p>
              <p className="text-xs text-blue-800">Não nos responsabilizamos pela qualidade da gasolina. Se o carro funcionar apenas com gasolina Podium ou outra marca específica, o cliente deve informar <strong>no ato da abertura do serviço</strong></p>
            </div>
          </div>
        </div>
        <button
          onClick={onConfirm}
          className="w-full py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold transition-all"
        >
          Entendi, continuar
        </button>
      </div>
    </div>
  );
}

export function LimpezaTelhadoAlertModal({ onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-t-3xl p-6 pb-8" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
        <div className="text-center mb-5">
          <span className="text-4xl mb-3 block">🏠</span>
          <h3 className="text-lg font-bold text-foreground mb-2">Limpeza de Telhado — Precificação no Local</h3>
          <p className="text-sm text-muted-foreground mb-4">
            O valor deste serviço é cobrado por <strong>metro quadrado</strong> e será avaliado e definido pelo profissional no local.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left space-y-3">
            <div>
              <p className="text-sm font-semibold text-amber-900 mb-1">📐 Cobrança por metro quadrado</p>
              <p className="text-2xl font-black text-amber-600">R$ 12 – R$ 25 <span className="text-sm font-semibold">por m²</span></p>
            </div>
            <div className="border-t border-amber-200 pt-3 space-y-2">
              <p className="text-xs font-semibold text-amber-900">O valor final depende de:</p>
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-sm mt-0.5">🧹</span>
                  <p className="text-xs text-amber-800"><strong>Grau de sujidade:</strong> telhados mais sujos exigem mais trabalho e produto</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm mt-0.5">⚠️</span>
                  <p className="text-xs text-amber-800"><strong>Grau de risco:</strong> altura, inclinação e condições de acesso ao telhado</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm mt-0.5">📏</span>
                  <p className="text-xs text-amber-800"><strong>Metragem:</strong> o profissional medirá e informará o valor total <strong>antes</strong> de iniciar</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border-2 border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="w-full py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold transition-all"
          >
            Entendi, continuar
          </button>
        </div>
      </div>
    </div>
  );
}