import React, { useState } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SERVICE_LABELS = {
  eletrica: "Elétrica", hidraulica: "Hidráulica", pintura: "Pintura",
  reparo_geral: "Reparo Geral", montagem: "Montagem", alvenaria: "Alvenaria",
  fechadura: "Fechadura", ar_condicionado: "Ar Condicionado",
  limpeza_caixa_dagua: "Limpeza Caixa d'Água", limpeza_calha: "Limpeza de Calha",
  substituicao_telha: "Substituição de Telha", limpeza_telhado: "Limpeza de Telhado",
  instalacao_coifa_parede: "Coifa de Parede", conversao_vaso_coplado: "Conversão Vaso",
  reparo_forro_gesso: "Forro de Gesso", desentupimento: "Desentupimento",
  troca_pneu: "Troca de Pneu", recarga_bateria: "Recarga Bateria",
  conserto_pneu: "Conserto Pneu", reboque: "Reboque",
  caca_vazamento: "Caça Vazamento", checkup: "Check-up",
  portao_eletronico: "Portão Eletrônico", rejunte: "Rejunte",
  pressurizador: "Pressurizador", instalacao_suporte_tv: "Suporte de TV", outros: "Outros",
};

const WARRANTY_DAYS = 90;

function daysRemaining(completedDate) {
  const completed = new Date(completedDate);
  const expiry = new Date(completed.getTime() + WARRANTY_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  return Math.max(0, Math.ceil((expiry - now) / (24 * 60 * 60 * 1000)));
}

export default function WarrantyBanner({ warrantyServices }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);

  if (!warrantyServices || warrantyServices.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border-2 border-green-300 bg-green-50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-green-800">
            {warrantyServices.length} serviço(s) em garantia
          </p>
          <p className="text-xs text-green-700">Toque para ver e solicitar retorno gratuito</p>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-green-600 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-green-600 flex-shrink-0" />}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {warrantyServices.map(req => {
                const days = daysRemaining(req.updated_date || req.created_date);
                const label = SERVICE_LABELS[req.service_type] || req.service_type;
                const dateStr = new Date(req.updated_date || req.created_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

                return (
                  <div key={req.id} className="bg-white rounded-xl border border-green-200 p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{label}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {req.provider_name && `${req.provider_name} · `}{req.address}{req.city ? `, ${req.city}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">Concluído em {dateStr}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                        days <= 15 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {days}d restantes
                      </span>
                    </div>
                    <button
                      onClick={() => navigate(`/acompanhar/${req.id}?retorno=1`)}
                      className="w-full mt-2 flex items-center justify-center gap-2 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Solicitar retorno em garantia
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}