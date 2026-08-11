import React from 'react';
import { Wrench, MapPin, Calendar, Grid2x2, FileText, Send } from 'lucide-react';
import { cn } from "@/lib/utils";
import { format } from 'date-fns';

const STATUS_HEADER = {
  concluido:    { label: 'CONCLUÍDO COM SUCESSO', bg: 'bg-gray-400', text: 'text-white' },
  cancelado:    { label: 'CANCELADO',              bg: 'bg-red-500',  text: 'text-white' },
  em_andamento: { label: 'EM ANDAMENTO',           bg: 'bg-orange-500', text: 'text-white' },
  a_caminho:    { label: 'A CAMINHO',              bg: 'bg-purple-500', text: 'text-white' },
  aceito:       { label: 'ACEITO',                 bg: 'bg-blue-500',  text: 'text-white' },
  aguardando:   { label: 'AGUARDANDO',             bg: 'bg-yellow-500', text: 'text-white' },
};

function Row({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-200 last:border-0">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium leading-none mb-0.5">{label}</p>
        <p className="text-sm font-bold text-gray-800 uppercase">{value}</p>
      </div>
    </div>
  );
}

export default function ServiceHistoryItem({ service, serviceLabel }) {
  const header = STATUS_HEADER[service.status] || STATUS_HEADER.aguardando;

  const finalDate = service.updated_date
    ? format(new Date(service.updated_date), 'dd/MM/yyyy HH:mm')
    : format(new Date(service.created_date), 'dd/MM/yyyy HH:mm');

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 mb-4">
      {/* Header */}
      <div className={cn('flex items-center justify-between px-4 py-2', header.bg)}>
        <span className={cn('text-xs font-black tracking-widest uppercase', header.text)}>
          {header.label}
        </span>
        <div className="flex items-center gap-1 opacity-80">
          <FileText className="w-3.5 h-3.5 text-white" />
          <span className="text-white text-xs font-bold">L</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pt-2 pb-3">
        <Row
          icon={Wrench}
          label="Serviço"
          value={service.service_number || service.id?.slice(0, 8).toUpperCase()}
        />
        <Row
          icon={Grid2x2}
          label="Tipo"
          value={serviceLabel}
        />
        <Row
          icon={MapPin}
          label="Bairro"
          value={service.neighborhood || service.city}
        />
        <Row
          icon={Calendar}
          label="Data final"
          value={finalDate}
        />
      </div>

      {/* Actions */}
      {service.status === 'concluido' && (
        <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-around">
          <button className="flex flex-col items-center gap-1 text-blue-600 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-semibold text-blue-600">Laudo digital</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-blue-600 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-semibold text-blue-600">Reenvio laudo</span>
          </button>
        </div>
      )}
    </div>
  );
}