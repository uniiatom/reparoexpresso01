import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Clock } from 'lucide-react';

/**
 * Exibe um aviso de sobretaxa se houver regras ativas no momento atual.
 * Pode receber um serviceType opcional para filtrar.
 */
export default function SurchargeAlert({ serviceType }) {
  const [surcharges, setSurcharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await base44.functions.invoke('getApplicableSurcharges', {
          service_type: serviceType || null,
        });
        const data = res.data;
        setSurcharges(data.applicable || []);
        setCurrentTime(data.reference_time || '');
      } catch (e) {
        // silencia erros
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [serviceType]);

  if (loading || surcharges.length === 0) return null;

  const totalPercent = surcharges.reduce((sum, s) => sum + s.surcharge_percent, 0);

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-bold text-orange-800 text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Sobretaxa aplicada: +{totalPercent}%
        </p>
        <div className="mt-1 space-y-0.5">
          {surcharges.map(s => (
            <p key={s.id} className="text-xs text-orange-700">
              • {s.name}: +{s.surcharge_percent}%
              {s.description ? ` — ${s.description}` : ''}
            </p>
          ))}
        </div>
        <p className="text-xs text-orange-600 mt-2">
          O valor final do serviço será acrescido dessas taxas por ser solicitado às {currentTime}.
        </p>
      </div>
    </div>
  );
}