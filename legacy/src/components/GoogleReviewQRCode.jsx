import React, { useState } from 'react';
import { QrCode, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// URL padrão de avaliação do Google — o prestador pode personalizar depois
const GOOGLE_REVIEW_URL = "https://g.page/r/me-socorro/review";

export default function GoogleReviewQRCode() {
  const [open, setOpen] = useState(false);

  // Gera QR Code via API pública do Google Charts
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(GOOGLE_REVIEW_URL)}`;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2 rounded-xl border-yellow-400 text-yellow-700 hover:bg-yellow-50"
        onClick={() => setOpen(true)}
      >
        <QrCode className="w-4 h-4" />
        QR Avaliação Google
      </Button>

      {open && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[60] bg-card rounded-3xl shadow-2xl p-6 max-w-xs mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-foreground text-lg">Avalie no Google</h2>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-muted">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4 text-center">
              Mostre este QR Code ao cliente para ele deixar sua avaliação no Google
            </p>

            <div className="flex justify-center mb-4">
              <div className="p-3 bg-white rounded-2xl border border-border shadow-sm">
                <img
                  src={qrUrl}
                  alt="QR Code Avaliação Google"
                  className="w-[180px] h-[180px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <a
                href={GOOGLE_REVIEW_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary font-semibold"
              >
                <ExternalLink className="w-3 h-3" />
                Abrir link direto
              </a>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-3">
              ⭐ Avaliações positivas aumentam sua visibilidade
            </p>
          </div>
        </>
      )}
    </>
  );
}