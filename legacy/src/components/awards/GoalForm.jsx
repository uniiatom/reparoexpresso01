import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Save, X } from 'lucide-react';

export default function GoalForm({ goal, month, onSave, onCancel, loading }) {
  const [form, setForm] = useState({
    min_jobs: 5,
    min_rating: 4.0,
    min_punctuality: 3.5,
    bonus_1st: 200,
    bonus_2nd: 100,
    bonus_3rd: 50,
  });

  useEffect(() => {
    if (goal) {
      setForm({
        min_jobs: goal.min_jobs ?? 5,
        min_rating: goal.min_rating ?? 4.0,
        min_punctuality: goal.min_punctuality ?? 3.5,
        bonus_1st: goal.bonus_1st ?? 200,
        bonus_2nd: goal.bonus_2nd ?? 100,
        bonus_3rd: goal.bonus_3rd ?? 50,
      });
    }
  }, [goal]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: parseFloat(val) || 0 }));

  const fields = [
    { key: 'min_jobs', label: 'Mín. serviços concluídos', step: 1, min: 1 },
    { key: 'min_rating', label: 'Avaliação média mínima (1-5)', step: 0.1, min: 1, max: 5 },
    { key: 'min_punctuality', label: 'Pontualidade mínima (1-5)', step: 0.1, min: 1, max: 5 },
    { key: 'bonus_1st', label: 'Bônus 🥇 1º lugar (R$)', step: 10, min: 0 },
    { key: 'bonus_2nd', label: 'Bônus 🥈 2º lugar (R$)', step: 10, min: 0 },
    { key: 'bonus_3rd', label: 'Bônus 🥉 3º lugar (R$)', step: 10, min: 0 },
  ];

  return (
    <Card className="border-primary/30 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-foreground text-sm">
            {goal ? 'Editar meta' : 'Nova meta'} — {month}
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-foreground block mb-1">{f.label}</label>
              <input
                type="number"
                step={f.step}
                min={f.min}
                max={f.max}
                value={form[f.key]}
                onChange={e => set(f.key, e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={onCancel}>
            <X className="w-4 h-4" /> Cancelar
          </Button>
          <Button size="sm" className="rounded-xl gap-2" onClick={() => onSave(form)} disabled={loading}>
            <Save className="w-4 h-4" /> {loading ? 'Salvando...' : 'Salvar meta'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}