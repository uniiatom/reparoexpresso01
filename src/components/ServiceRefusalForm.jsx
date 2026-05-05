import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Upload, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

const REFUSAL_REASONS = [
  { id: 'falta_luz', label: 'Falta de luz elétrica' },
  { id: 'local_alagado', label: 'Local alagado com risco de choque' },
  { id: 'risco_desabamento', label: 'Estrutura com risco de desabamento' },
  { id: 'animais_agressivos', label: 'Animais agressivos soltos' },
  { id: 'insalubridade', label: 'Insalubridade extrema (risco biológico/químico)' },
  { id: 'ausencia_agua', label: 'Ausência de ponto de água necessário' },
  { id: 'ausencia_energia', label: 'Ausência de ponto de energia necessário' },
  { id: 'inacessivel', label: 'Local inacessível' },
];

export default function ServiceRefusalForm({ serviceRequest, onSuccess }) {
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const handleReasonToggle = (reasonId) => {
    setSelectedReasons(prev =>
      prev.includes(reasonId)
        ? prev.filter(r => r !== reasonId)
        : [...prev, reasonId]
    );
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedPhotos = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedPhotos.push(file_url);
      }
      setPhotos(prev => [...prev, ...uploadedPhotos]);
      toast.success(`${uploadedPhotos.length} foto(s) enviada(s)`);
    } catch (error) {
      toast.error('Erro ao enviar fotos');
    } finally {
      setUploading(false);
    }
  };

  const submitRefusal = useMutation({
    mutationFn: async () => {
      if (selectedReasons.length === 0) {
        throw new Error('Selecione pelo menos um motivo');
      }
      if (!description.trim()) {
        throw new Error('Descreva o problema detalhadamente');
      }
      if (photos.length === 0) {
        throw new Error('Envie pelo menos uma foto como comprovação');
      }

      return base44.functions.invoke('processServiceRefusal', {
        service_request_id: serviceRequest.id,
        provider_id: serviceRequest.provider_id,
        reasons: selectedReasons,
        description: description.trim(),
        photos,
      });
    },
    onSuccess: () => {
      toast.success('Recusa registrada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['acceptedServices'] });
      setSelectedReasons([]);
      setDescription('');
      setPhotos([]);
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao registrar recusa');
    },
  });

  const reasonLabels = selectedReasons.map(id =>
    REFUSAL_REASONS.find(r => r.id === id)?.label
  ).filter(Boolean);

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          Recusar Serviço
        </CardTitle>
        <CardDescription>
          Registre os motivos técnicos que impedem a execução (conforme cláusula 6 do contrato)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Motivos */}
        <div>
          <p className="font-semibold text-foreground mb-3">Selecione os motivos:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {REFUSAL_REASONS.map(reason => (
              <label
                key={reason.id}
                className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-background cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedReasons.includes(reason.id)}
                  onChange={() => handleReasonToggle(reason.id)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-foreground">{reason.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Motivos selecionados */}
        {reasonLabels.length > 0 && (
          <div className="p-3 rounded-lg bg-white border border-red-200">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Motivos selecionados:</p>
            <div className="flex flex-wrap gap-2">
              {reasonLabels.map((label, idx) => (
                <span key={idx} className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium">
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Descrição detalhada */}
        <div>
          <p className="font-semibold text-foreground mb-2">Descrição detalhada</p>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Descreva em detalhes o problema identificado no local e por que não é possível executar o serviço..."
            className="h-24"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {description.length}/500 caracteres
          </p>
        </div>

        {/* Upload de fotos */}
        <div>
          <p className="font-semibold text-foreground mb-2">Fotos do local</p>
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploading}
              className="hidden"
              id="photo-upload"
            />
            <label htmlFor="photo-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2">
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                ) : (
                  <Upload className="w-6 h-6 text-muted-foreground" />
                )}
                <p className="text-sm font-medium text-foreground">
                  {uploading ? 'Enviando...' : 'Clique para enviar fotos'}
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG até 5MB cada
                </p>
              </div>
            </label>
          </div>

          {/* Fotos enviadas */}
          {photos.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">
                {photos.length} foto(s) enviada(s)
              </p>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={photo}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-20 object-cover rounded-lg border border-border"
                    />
                    <button
                      onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                      className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <span className="text-white text-xs font-bold">Remover</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Botão enviar */}
        <Button
          onClick={() => submitRefusal.mutate()}
          disabled={submitRefusal.isPending || selectedReasons.length === 0 || !description.trim() || photos.length === 0}
          className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl h-11"
        >
          {submitRefusal.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Registrando recusa...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Registrar Recusa
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          A recusa será analisada e o cliente receberá um estorno automático deduzida a taxa de deslocamento (conforme cláusula 6.5).
        </p>
      </CardContent>
    </Card>
  );
}