import React from 'react';
import { Button } from "@/components/ui/button";
import { X, Gift, Heart } from "lucide-react";

export default function TipAnnouncementModal({ provider, onClose, onAccept }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-2">
      <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎁</span>
            <h2 className="text-lg font-bold text-foreground">Cliente Quer Gratificar!</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Heart className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">Parabéns! 🎉</p>
              <p className="text-xs text-amber-800">{provider.name} fez um excelente trabalho</p>
            </div>
          </div>

          <p className="text-sm text-amber-800 font-semibold text-center">
            O cliente deseja enviar uma gratificação para você! 💰
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 space-y-2">
          <p className="text-xs font-semibold text-blue-900">📊 Como funciona:</p>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>✓ O cliente enviará a gorjeta voluntariamente</li>
            <li>✓ Você não precisa solicitar nada</li>
            <li>✓ A gorjeta será creditada em sua carteira automaticamente</li>
          </ul>
        </div>

        <div className="flex gap-2">
          <Button onClick={onClose} variant="outline" className="flex-1 rounded-2xl">
            Fechar
          </Button>
          <Button
            onClick={onAccept}
            className="flex-1 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:from-amber-600 hover:to-orange-600"
          >
            <Gift className="w-4 h-4 mr-2" /> Agradecer
          </Button>
        </div>
      </div>
    </div>
  );
}