import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift } from 'lucide-react';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function BonusHistoryPanel({ releases }) {
  if (releases.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Gift className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum bônus liberado neste mês</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {releases.map(r => (
          <div key={r.id} className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <span className="text-xl">{MEDAL[r.rank] || `#${r.rank}`}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{r.provider_name}</p>
                <p className="text-xs text-muted-foreground">
                  Score {r.score} · {r.jobs_completed} serviços · ⭐ {r.avg_rating} · ⏱️ {r.avg_punctuality}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-extrabold text-amber-700">R$ {r.bonus_amount?.toLocaleString('pt-BR')}</p>
              <Badge className={r.status === 'pago' ? 'bg-green-100 text-green-800 border-0 text-xs' : 'bg-yellow-100 text-yellow-800 border-0 text-xs'}>
                {r.status === 'pago' ? '✅ Pago' : '⏳ Pendente'}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}