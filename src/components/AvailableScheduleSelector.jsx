import React, { useState } from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { addDays, format, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AVAILABLE_HOURS = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
const AVAILABLE_DAYS = 7; // Próximos 7 dias

export default function AvailableScheduleSelector({ onConfirm, onCancel }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  // Gerar datas disponíveis (próximos 7 dias)
  const availableDates = Array.from({ length: AVAILABLE_DAYS }).map((_, i) => {
    return addDays(new Date(), i);
  });

  const handleConfirm = () => {
    if (selectedDate && selectedTime) {
      onConfirm({
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className="fixed inset-x-4 top-12 z-[60] bg-card rounded-3xl p-4 shadow-2xl max-w-sm mx-auto max-h-[70vh] overflow-y-auto"
    >
      <button 
        onClick={onCancel}
        className="text-sm text-primary font-semibold mb-3 flex items-center gap-1"
      >
        ← Voltar
      </button>

      <h2 className="text-xl font-bold text-foreground mb-4">Agendar Serviço</h2>

      {/* Seleção de Data */}
      <div className="mb-6">
        <label className="text-sm font-semibold text-foreground block mb-3">Datas disponíveis</label>
        <div className="grid grid-cols-4 gap-2">
          {availableDates.map((date, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedDate(date);
                setSelectedTime(null); // Reset time when changing date
              }}
              className={`p-3 rounded-2xl transition-all border-2 text-center ${
                selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <p className="text-xs font-bold text-foreground">
                {format(date, 'd')}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(date, 'EEE', { locale: ptBR })}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Seleção de Hora */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <label className="text-sm font-semibold text-foreground block mb-3">Horários disponíveis</label>
          <div className="grid grid-cols-4 gap-2">
            {AVAILABLE_HOURS.map((hour) => (
              <button
                key={hour}
                onClick={() => setSelectedTime(hour)}
                className={`p-3 rounded-2xl transition-all border-2 text-center ${
                  selectedTime === hour
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <p className="text-xs font-bold text-foreground">{hour}</p>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Resumo */}
      {selectedDate && selectedTime && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 border border-primary/20 rounded-2xl p-3 mb-6"
        >
          <p className="text-xs text-muted-foreground mb-1">Agendamento confirmado:</p>
          <p className="text-sm font-bold text-foreground">
            {format(selectedDate, "d 'de' MMMM", { locale: ptBR })} às {selectedTime}
          </p>
        </motion.div>
      )}

      {/* Botões */}
      <div className="flex gap-2">
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1 rounded-2xl"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!selectedDate || !selectedTime}
          className="flex-1 rounded-2xl"
        >
          Confirmar
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
}