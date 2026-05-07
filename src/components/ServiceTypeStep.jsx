import React from 'react';
import { cn } from "@/lib/utils";
import PressurizadorModal from "@/components/PressurizadorModal";
import ValvulaTransfModal from "@/components/ValvulaTransfModal";
import { SERVICE_TYPES } from "@/lib/serviceTypes";

export default function ServiceTypeStep({
  serviceTab,
  setServiceTab,
  form,
  set,
  tvSize,
  setTvSize,
  showTvSizeModal,
  setShowTvSizeModal,
  forroGessoTipo,
  setForroGessoTipo,
  showForroGessoModal,
  setShowForroGessoModal,
  showPressurizadorModal,
  setShowPressurizadorModal,
  pressurizadorTipo,
  setPressurizadorTipo,
  showValvulaTransfModal,
  setShowValvulaTransfModal,
  valvulaTransfTipo,
  setValvulaTransfTipo,
  desentupimentoTipo,
  setDesentupimentoTipo,
  showDesentupimentoModal,
  setShowDesentupimentoModal,
  showMolaAlert,
  setShowMolaAlert,
  showNaoSeiAlert,
  setShowNaoSeiAlert,
  caixaDaguaTipo,
  setCaixaDaguaTipo,
  caixaDaguaLitragem,
  setCaixaDaguaLitragem,
  caixaDaguaStep,
  setCaixaDaguaStep,
  showCaixaDaguaModal,
  setShowCaixaDaguaModal,
  showPaneSeccaAlert,
  setShowPaneSeccaAlert,
  descriptionsPerService,
  setDescriptionsPerService,
}) {

  return (
    <>
      <h2 className="text-2xl font-bold text-foreground mb-1">Qual serviço?</h2>
      <p className="text-muted-foreground mb-4">Selecione um ou mais serviços — cada um gera uma OS com senha própria</p>
      <div className="flex gap-2 mb-5">
        <button onClick={() => setServiceTab('casa')}
          className={cn("flex-1 py-2 rounded-xl text-sm font-semibold transition-all",
            serviceTab === 'casa' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
          🏠 Casa
        </button>
        <button onClick={() => setServiceTab('veiculo')}
          className={cn("flex-1 py-2 rounded-xl text-sm font-semibold transition-all",
            serviceTab === 'veiculo' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
          🚗 Veículo
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {SERVICE_TYPES.filter(s => s.group === serviceTab).map(s => {
          const Icon = s.icon;
          const selected = form.service_type.includes(s.value);
          return (
            <button key={s.value} onClick={() => {
              if (s.value === 'pressurizador' && !selected) {
                setShowPressurizadorModal(true);
                return;
              }
              if (s.value === 'pressurizador' && selected) {
                setPressurizadorTipo(null);
              }
              set('service_type', selected
                ? form.service_type.filter(t => t !== s.value)
                : [...form.service_type, s.value]
              );
            }}
              className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all active:scale-95",
                selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}>
              <Icon className={cn("w-7 h-7", selected ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-xs font-medium text-center leading-tight", selected ? "text-primary" : "text-foreground")}>
                {s.value === 'pressurizador' && pressurizadorTipo ? (
                  <><span>Pressurizador</span><br /><span className="text-[10px] opacity-75">({pressurizadorTipo === 'visita_tecnica' ? 'Visita' : pressurizadorTipo === 'instalacao' ? 'Instalação' : 'Reparo'})</span></>
                ) : s.label}
              </span>
              {selected && <span className="w-4 h-4 bg-primary rounded-full flex items-center justify-center"><span className="text-white text-[9px] font-black">✓</span></span>}
            </button>
          );
        })}
      </div>

      {showPressurizadorModal && <PressurizadorModal isOpen={showPressurizadorModal} onClose={() => setShowPressurizadorModal(false)} onSelect={(tipo) => { setPressurizadorTipo(tipo); set('service_type', [...form.service_type, 'pressurizador']); setShowPressurizadorModal(false); }} />}

      {showValvulaTransfModal && <ValvulaTransfModal onSelect={(tipo) => { setValvulaTransfTipo(tipo); set('service_type', [...form.service_type, 'valvula_transferidora_pressao']); setShowValvulaTransfModal(false); }} onCancel={() => setShowValvulaTransfModal(false)} />}

      {form.service_type.length > 0 && (
        <div className="mt-4 bg-primary/5 rounded-2xl p-3 border border-primary/20">
          <p className="text-xs font-semibold text-primary mb-1">
            {form.service_type.length} serviço(s) selecionado(s) — cada um gerará uma OS com senha separada
          </p>
          <p className="text-xs text-muted-foreground">
            {form.service_type.map(t => SERVICE_TYPES.find(s => s.value === t)?.label).join(' • ')}
          </p>
        </div>
      )}
    </>
  );
}