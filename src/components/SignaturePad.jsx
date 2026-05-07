import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { RotateCcw, Maximize2, CheckCircle2, X } from "lucide-react";

function SignatureCanvas({ canvasRef, onStart, onDraw, onStop }) {
  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full touch-none cursor-crosshair bg-white"
      onMouseDown={onStart}
      onMouseMove={onDraw}
      onMouseUp={onStop}
      onMouseLeave={onStop}
      onTouchStart={onStart}
      onTouchMove={onDraw}
      onTouchEnd={onStop}
    />
  );
}

export default function SignaturePad({ label, onSave }) {
  const canvasRef = useRef(null);
  const fullCanvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const setupCtx = (canvas) => {
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    return ctx;
  };

  useEffect(() => {
    if (canvasRef.current) setupCtx(canvasRef.current);
  }, []);

  useEffect(() => {
    if (fullscreen) {
      // Aguarda o DOM renderizar antes de dimensionar
      const timeout = setTimeout(() => {
        const canvas = fullCanvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        setupCtx(canvas);
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [fullscreen]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Mini canvas handlers (preview only, no drawing)
  const openFullscreen = () => setFullscreen(true);

  // Fullscreen canvas handlers
  const startDraw = (e) => {
    e.preventDefault();
    const canvas = fullCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
    setHasSignature(true);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const canvas = fullCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDraw = () => setDrawing(false);

  const clearFullscreen = () => {
    const canvas = fullCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const confirmSignature = () => {
    const canvas = fullCanvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    setPreviewUrl(dataUrl);
    onSave(dataUrl);
    setFullscreen(false);
  };

  const cancelFullscreen = () => {
    // Corrigir: fecha sem salvar, mantém estado anterior
    clearFullscreen();
    setHasSignature(false);
    setFullscreen(false);
    if (!previewUrl) onSave(null);
  };

  const clearAll = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setPreviewUrl(null);
    setHasSignature(false);
    onSave(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {previewUrl && (
          <button onClick={clearAll} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
            <RotateCcw className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>

      {/* Mini preview / click to open */}
      <button
        type="button"
        onClick={openFullscreen}
        className={`w-full rounded-2xl border-2 overflow-hidden transition-colors relative group ${previewUrl ? 'border-green-500' : 'border-dashed border-border hover:border-primary/50'}`}
        style={{ height: 80 }}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Assinatura" className="w-full h-full object-contain bg-white" />
        ) : (
          <div className="w-full h-full bg-white flex flex-col items-center justify-center gap-1 text-muted-foreground">
            <Maximize2 className="w-5 h-5" />
            <span className="text-xs">Toque para assinar</span>
          </div>
        )}
        {previewUrl && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
            <span className="text-xs bg-black/60 text-white px-2 py-1 rounded-lg">Toque para editar</span>
          </div>
        )}
      </button>

      <p className="text-xs text-muted-foreground">
        {previewUrl ? '✓ Assinatura capturada' : 'Toque na área acima para assinar'}
      </p>

      {/* Fullscreen modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-white flex-shrink-0">
            <p className="font-semibold text-foreground text-sm">{label}</p>
            <button onClick={cancelFullscreen} className="p-1.5 rounded-lg hover:bg-accent">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Canvas area */}
          <div className="flex-1 relative bg-gray-50">
            <div className="absolute inset-4 bg-white rounded-2xl border-2 border-dashed border-border overflow-hidden shadow-inner">
              <canvas
                ref={fullCanvasRef}
                style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: 'crosshair' }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-muted-foreground text-sm">Assine aqui com o dedo</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex gap-3 px-4 py-4 border-t border-border bg-white flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={clearFullscreen}
              className="flex-1 rounded-2xl h-12 gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Corrigir
            </Button>
            <Button
              type="button"
              onClick={confirmSignature}
              disabled={!hasSignature}
              className="flex-1 rounded-2xl h-12 gap-2 bg-primary text-primary-foreground"
            >
              <CheckCircle2 className="w-4 h-4" /> Concluir
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}