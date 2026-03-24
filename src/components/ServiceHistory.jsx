import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import ServiceHistoryItem from './ServiceHistoryItem';

const SERVICE_LABELS = {
  eletrica: "Elétrica",
  hidraulica: "Hidráulica",
  pintura: "Pintura",
  reparo_geral: "Reparo Geral",
  montagem: "Montagem",
  alvenaria: "Alvenaria",
  fechadura: "Fechadura",
  ar_condicionado: "Ar Condicionado",
  limpeza_caixa_dagua: "Limpeza Caixa d'Água",
  limpeza_calha: "Limpeza de Calha",
  substituicao_telha: "Substituição de Telha",
  limpeza_telhado: "Limpeza de Telhado",
  instalacao_coifa_parede: "Coifa de Parede",
  instalacao_coifa_ilha: "Coifa Ilha",
  conversao_vaso_coplado: "Conversão Vaso CX Acoplada",
  instalacao_vaso_monobloco: "Vaso Monobloco",
  reparo_forro_gesso: "Reparo Forro de Gesso",
  desentupimento: "Desentupimento",
  troca_pneu: "Troca de Pneu",
  recarga_bateria: "Recarga de Bateria",
  conserto_pneu: "Conserto de Pneu",
  reboque: "Reboque",
  outros: "Outros",
};

const STATUS_CONFIG = {
  aguardando: { label: "Aguardando", color: "bg-yellow-100 text-yellow-800" },
  aceito: { label: "Aceito", color: "bg-blue-100 text-blue-800" },
  a_caminho: { label: "A caminho", color: "bg-purple-100 text-purple-800" },
  em_andamento: { label: "Em andamento", color: "bg-orange-100 text-orange-800" },
  concluido: { label: "Concluído", color: "bg-green-100 text-green-800" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-800" },
};

export default function ServiceHistory({ serviceRequests }) {
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpanded = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-3">
      {serviceRequests.map((service) => (
        <ServiceHistoryItem
          key={service.id}
          service={service}
          serviceLabel={SERVICE_LABELS[service.service_type] || service.service_type}
        />
      ))}
    </div>
  );
}