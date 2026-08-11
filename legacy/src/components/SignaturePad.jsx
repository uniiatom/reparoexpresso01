import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { RotateCcw, Maximize2, CheckCircle2, X, Camera, RefreshCw } from "lucide-react";

export default function SignaturePad({ label, onSave }) {
  const fullCanvasRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [signerPhotoUrl, setSignerPhotoUrl] = useState(null);

  // Step: 'photo' | 'signature'
  const [step, setStep] = useState('photo');
  const [cameraActive, setCameraActive] = useState(false);
  const [photoTaken, setPhotoTaken] = useState(false);

  const setupCtx = (canvas) => {
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    return ctx;
  };

  // Init canvas after fullscreen + step=signature
  useEffect(() => {
    if (fullscreen && step === 'signature') {
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
  }, [fullscreen, step]);

  // Start camera when entering photo step
  useEffect(() => {
    if (fullscreen && step === 'photo' && !photoTaken) {
      startCamera();
    }
    return () => {
      if (step !== 'photo') stopCamera();
    };
  }, [fullscreen, step]);

  const startCamera = async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch {
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setSignerPhotoUrl(dataUrl);
    setPhotoTaken(true);
    stopCamera();
  };

  const retakePhoto = () => {
    setSignerPhotoUrl(null);
    setPhotoTaken(false);
    startCamera();
  };

  const proceedToSignature = () => {
    setStep('signature');
  };

  // Drawing handlers
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

  const clearSignature = () => {
    const canvas = fullCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const confirmSignature = () => {
    const canvas = fullCanvasRef.current;
    const signatureDataUrl = canvas.toDataURL('image/png');
    setPreviewUrl(signatureDataUrl);
    onSave({ signature: signatureDataUrl, signer_photo: signerPhotoUrl });
    closeFullscreen();
  };

  const openFullscreen = () => {
    setStep('photo');
    setPhotoTaken(false);
    setSignerPhotoUrl(null);
    setHasSignature(false);
    setFullscreen(true);
  };

  const closeFullscreen = () => {
    stopCamera();
    setFullscreen(false);
    setStep('photo');
  };

  const cancelFullscreen = () => {
    closeFullscreen();
    if (!previewUrl) onSave(null);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">{label}</p>

      {/* Mini preview */}
      <div
        className={`w-full rounded-2xl border-2 overflow-hidden transition-colors relative ${previewUrl ? 'border-green-500' : 'border-dashed border-border'}`}
        style={{ height: 80 }}
        onClick={!previewUrl ? openFullscreen : undefined}
        role={!previewUrl ? 'button' : undefined}
      >
        {previewUrl ? (
          <div className="flex h-full">
            {signerPhotoUrl && (
              <img src={signerPhotoUrl} alt="Signatário" className="h-full w-20 object-cover border-r border-green-200 flex-shrink-0" />
            )}
            <img src={previewUrl} alt="Assinatura" className="flex-1 h-full object-contain bg-white" />
          </div>
        ) : (
          <div className="w-full h-full bg-white flex flex-col items-center justify-center gap-1 text-muted-foreground">
            <Maximize2 className="w-5 h-5" />
            <span className="text-xs">Toque para assinar</span>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {previewUrl ? '✓ Assinatura e foto capturadas' : 'Toque na área acima para assinar'}
      </p>

      {/* Fullscreen modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-white flex-shrink-0">
            <div>
              <p className="font-semibold text-foreground text-sm">{label}</p>
              <p className="text-xs text-muted-foreground">
                {step === 'photo' ? 'Passo 1 de 2: Foto do signatário' : 'Passo 2 de 2: Assinatura'}
              </p>
            </div>
            <button onClick={cancelFullscreen} className="p-1.5 rounded-lg hover:bg-accent">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Step indicators */}
          <div className="flex gap-2 px-4 py-2 bg-gray-50 border-b border-border flex-shrink-0">
            <div className={`flex-1 h-1.5 rounded-full ${step === 'photo' || step === 'signature' ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex-1 h-1.5 rounded-full ${step === 'signature' ? 'bg-primary' : 'bg-muted'}`} />
          </div>

          {/* STEP 1: Photo */}
          {step === 'photo' && (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-4 gap-4">
              <p className="text-sm text-center text-muted-foreground">
                📸 Tire uma foto de quem está assinando para registrar a identidade
              </p>

              {!photoTaken ? (
                <div className="w-full max-w-sm">
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] w-full shadow-lg">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                    {!cameraActive && (
                      <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                        Iniciando câmera...
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={capturePhoto}
                    disabled={!cameraActive}
                    className="w-full mt-4 h-12 rounded-2xl gap-2 bg-primary text-primary-foreground font-bold"
                  >
                    <Camera className="w-5 h-5" /> Tirar foto
                  </Button>
                </div>
              ) : (
                <div className="w-full max-w-sm">
                  <div className="rounded-2xl overflow-hidden aspect-[4/3] w-full shadow-lg">
                    <img src={signerPhotoUrl} alt="Foto do signatário" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex gap-3 mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={retakePhoto}
                      className="flex-1 h-12 rounded-2xl gap-2"
                    >
                      <RefreshCw className="w-4 h-4" /> Refazer
                    </Button>
                    <Button
                      type="button"
                      onClick={proceedToSignature}
                      className="flex-1 h-12 rounded-2xl gap-2 bg-primary text-primary-foreground font-bold"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Usar foto
                    </Button>
                  </div>
                </div>
              )}

              {/* Skip photo option */}
              {!photoTaken && (
                <button
                  type="button"
                  onClick={() => { setStep('signature'); }}
                  className="text-xs text-muted-foreground underline underline-offset-2"
                >
                  Pular foto e assinar diretamente
                </button>
              )}
            </div>
          )}

          {/* STEP 2: Signature */}
          {step === 'signature' && (
            <>
              {/* Signer photo thumbnail */}
              {signerPhotoUrl && (
                <div className="flex items-center gap-3 px-4 py-2 bg-green-50 border-b border-green-200 flex-shrink-0">
                  <img src={signerPhotoUrl} alt="Signatário" className="w-10 h-10 rounded-xl object-cover border border-green-300" />
                  <p className="text-xs text-green-800 font-medium">Foto do signatário registrada ✓</p>
                </div>
              )}

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
                  onClick={clearSignature}
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
            </>
          )}
        </div>
      )}
    </div>
  );
}