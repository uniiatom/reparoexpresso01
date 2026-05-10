import React from 'react';
import { Shield, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WarrantyBadge({ request }) {
  if (!request?.warranty_end_date || request.warranty_status !== 'ativa') {
    return null;
  }

  const endDate = new Date(request.warranty_end_date);
  const now = new Date();
  const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining <= 0;

  if (isExpired) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-center gap-3 mb-4">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-red-800">Garantia Expirada</p>
          <p className="text-xs text-red-600 mt-0.5">
            Expirou em {endDate.toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>
    );
  }

  const getStatusColor = (days) => {
    if (days > 30) return 'bg-green-50 border-green-200';
    if (days > 7) return 'bg-yellow-50 border-yellow-200';
    return 'bg-orange-50 border-orange-200';
  };

  const getTextColor = (days) => {
    if (days > 30) return 'text-green-800';
    if (days > 7) return 'text-yellow-800';
    return 'text-orange-800';
  };

  return (
    <div className={cn('rounded-2xl p-3 border-2 flex items-center gap-3 mb-4', getStatusColor(daysRemaining))}>
      <Shield className={cn('w-5 h-5 flex-shrink-0', getTextColor(daysRemaining).replace('text-', 'text-'))} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-bold', getTextColor(daysRemaining))}>
          🛡️ Cobertura de Garantia Ativa
        </p>
        <p className={cn('text-xs mt-0.5', getTextColor(daysRemaining).replace('800', '600'))}>
          {daysRemaining} dia{daysRemaining !== 1 ? 's' : ''} restante{daysRemaining !== 1 ? 's' : ''} • Vence em {endDate.toLocaleDateString('pt-BR')}
        </p>
      </div>
      <Clock className={cn('w-4 h-4 flex-shrink-0', getTextColor(daysRemaining).replace('800', '600'))} />
    </div>
  );
}