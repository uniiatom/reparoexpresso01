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

export function NaoSeiLitragemModal({ caixaDaguaTipo, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-t-3xl p-6 pb-8" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
        <div className="text-center mb-5">
          <span className="text-4xl mb-3 block">📏</span>
          <h3 className="text-lg font-bold text-foreground mb-2">Litragem não informada</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Sem problema! O prestador irá medir e avaliar a capacidade da caixa d'água no local antes de iniciar a limpeza.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-left">
            <p className="text-sm font-semibold text-blue-900 mb-1">ℹ️ Como funciona:</p>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>O técnico mede a litragem da caixa no local</li>
              <li>Informa o valor correspondente ao cliente</li>
              <li>A cobrança é confirmada <strong>antes</strong> de iniciar a limpeza</li>
            </ul>
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

export function ArCondicionadoModal({ onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-t-3xl p-6 pb-8" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
        <h3 className="text-lg font-bold text-foreground mb-1 text-center">Ar Condicionado</h3>
        <p className="text-sm text-muted-foreground text-center mb-5">Qual tipo de serviço você precisa?</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onSelect('conserto')}
            className="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-border hover:border-primary/50 transition-all active:scale-95"
          >
            <span className="text-3xl">🔧</span>
            <p className="font-bold text-foreground text-sm">Conserto</p>
            <p className="text-xs text-muted-foreground text-center">Não liga, não resfria, barulho, vazamento</p>
          </button>
          <button
            onClick={() => onSelect('limpeza_quimica')}
            className="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-border hover:border-primary/50 transition-all active:scale-95"
          >
            <span className="text-3xl">🧴</span>
            <p className="font-bold text-foreground text-sm">Limpeza Química</p>
            <p className="text-xs text-muted-foreground text-center">Higienização completa com produto químico</p>
          </button>
        </div>
      </div>
    </div>
  );
}

export function LimpezaCalhaTelhadoAlertModal({ onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-t-3xl p-6 pb-8" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
        <div className="text-center mb-5">
          <span className="text-4xl mb-3 block">🏚️</span>
          <h3 className="text-lg font-bold text-foreground mb-2">Limpeza de Calha — Precificação por Metro</h3>
          <p className="text-sm text-muted-foreground mb-4">
            O valor é cobrado por <strong>metro linear</strong> de calha.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-left space-y-3">
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">📏 Cobrança por metro linear</p>
              <p className="text-2xl font-black text-blue-600">R$ 12,00 <span className="text-sm font-semibold">por metro</span></p>
              <p className="text-xs text-blue-700 mt-1">Mínimo de 10 metros (R$ 120,00)</p>
            </div>
            <div className="border-t border-blue-200 pt-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-sm mt-0.5">📐</span>
                <p className="text-xs text-blue-800"><strong>Altura máxima:</strong> até 6 metros</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm mt-0.5">⚠️</span>
                <p className="text-xs text-blue-800"><strong>Andaime:</strong> se necessário, o custo do andaime é por conta do cliente</p>
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
            className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold transition-all"
          >
            Entendi, continuar
          </button>
        </div>
      </div>
    </div>
  );
}

export function SubstituicaoTelhaModal({ onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-t-3xl p-6 pb-8" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
        <h3 className="text-lg font-bold text-foreground mb-1 text-center">Substituição de Telha</h3>
        <p className="text-sm text-muted-foreground text-center mb-5">Qual o tipo de telha?</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onSelect('ceramica')}
            className="flex flex-col items-center gap-0 rounded-2xl border-2 border-border hover:border-primary/50 transition-all active:scale-95 overflow-hidden"
          >
            <img
              src="https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/f5fd5b3c3_Telhas-Ceramicas.jpg"
              alt="Telha cerâmica"
              className="w-full h-28 object-cover"
            />
            <div className="p-3 text-center">
              <p className="font-bold text-foreground text-sm">Telha Cerâmica</p>
              <p className="text-xs text-muted-foreground">Barro, colonial, portuguesa</p>
              <p className="text-xs font-semibold text-primary mt-1">R$ 130,00 · até 18 telhas</p>
            </div>
          </button>
          <button
            onClick={() => onSelect('fibrocimento')}
            className="flex flex-col items-center gap-0 rounded-2xl border-2 border-border hover:border-primary/50 transition-all active:scale-95 overflow-hidden"
          >
            <img
              src="https://media.base44.com/images/public/69bdfd09a4593d6a3b1890df/fbe1ff836_OIP.jpg"
              alt="Telha fibrocimento"
              className="w-full h-28 object-cover"
            />
            <div className="p-3 text-center">
              <p className="font-bold text-foreground text-sm">Fibrocimento</p>
              <p className="text-xs text-muted-foreground">Eternit, Brasilit, ondulada</p>
            </div>
          </button>
        </div>
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