import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Camera, Loader2, CheckCircle2, User, UserCheck } from "lucide-react";
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

function PhotoUploadCard({ label, icon: Icon, currentUrl, onUploaded, description }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onUploaded(file_url);
    setUploading(false);
    toast.success(`${label} atualizada!`);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        <p className="font-semibold text-foreground text-sm">{label}</p>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{description}</p>

      {/* Preview */}
      <div className="w-full h-48 rounded-xl bg-muted overflow-hidden mb-3 flex items-center justify-center">
        {currentUrl ? (
          <img src={currentUrl} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="text-center text-muted-foreground">
            <Icon className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs">Nenhuma foto</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        variant="outline"
        className="w-full rounded-xl"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Enviando...</>
        ) : (
          <><Camera className="w-4 h-4 mr-2" /> {currentUrl ? 'Trocar foto' : 'Adicionar foto'}</>
        )}
      </Button>
    </div>
  );
}

export default function ProviderPhotoEditor({ provider, onUpdate }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState({
    photo_url: provider.photo_url || '',
    photo_body_url: provider.photo_body_url || '',
  });

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Provider.update(provider.id, photos);
    queryClient.invalidateQueries({ queryKey: ['my-provider'] });
    onUpdate?.(photos);
    setSaving(false);
    toast.success('Fotos salvas com sucesso!');
  };

  const hasChanges =
    photos.photo_url !== (provider.photo_url || '') ||
    photos.photo_body_url !== (provider.photo_body_url || '');

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
        <p className="text-xs text-amber-800 font-semibold">
          📸 Suas fotos são exibidas para os clientes antes de aceitar o serviço. Use fotos nítidas e profissionais.
        </p>
      </div>

      <PhotoUploadCard
        label="Foto de rosto"
        icon={User}
        currentUrl={photos.photo_url}
        description="Foto clara do seu rosto, preferencialmente fundo neutro."
        onUploaded={(url) => setPhotos(p => ({ ...p, photo_url: url }))}
      />

      <PhotoUploadCard
        label="Foto de corpo inteiro"
        icon={UserCheck}
        currentUrl={photos.photo_body_url}
        description="Foto com uniforme ou roupa de trabalho, corpo inteiro visível."
        onUploaded={(url) => setPhotos(p => ({ ...p, photo_body_url: url }))}
      />

      {hasChanges && (
        <Button
          className="w-full rounded-2xl h-12 font-bold bg-primary text-primary-foreground"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...</>
          ) : (
            <><CheckCircle2 className="w-4 h-4 mr-2" /> Salvar fotos</>
          )}
        </Button>
      )}
    </div>
  );
}