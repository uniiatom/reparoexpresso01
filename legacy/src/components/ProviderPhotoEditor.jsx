import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Camera, Loader2, CheckCircle2, User, UserCheck, Clock } from "lucide-react";
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

function PhotoUploadCard({ label, icon: Icon, currentUrl, pendingUrl, onUploaded, description }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onUploaded(file_url);
    setUploading(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        <p className="font-semibold text-foreground text-sm">{label}</p>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{description}</p>

      {/* Preview */}
      <div className="w-full h-48 rounded-xl bg-muted overflow-hidden mb-2 flex items-center justify-center relative">
        {(pendingUrl || currentUrl) ? (
          <img src={pendingUrl || currentUrl} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="text-center text-muted-foreground">
            <Icon className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs">Nenhuma foto</p>
          </div>
        )}
        {pendingUrl && (
          <div className="absolute bottom-2 left-2 right-2 bg-orange-500/90 text-white text-xs font-semibold rounded-lg px-2 py-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Aguardando aprovação do admin
          </div>
        )}
      </div>
      {pendingUrl && currentUrl && (
        <p className="text-xs text-muted-foreground mb-2">Foto atual ainda visível até aprovação</p>
      )}

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
  const [pendingPhotos, setPendingPhotos] = useState({
    photo_url_pending: '',
    photo_body_url_pending: '',
  });

  const handleSave = async () => {
    setSaving(true);
    const updateData = { photos_pending_review: true };
    if (pendingPhotos.photo_url_pending) updateData.photo_url_pending = pendingPhotos.photo_url_pending;
    if (pendingPhotos.photo_body_url_pending) updateData.photo_body_url_pending = pendingPhotos.photo_body_url_pending;
    await base44.entities.Provider.update(provider.id, updateData);
    queryClient.invalidateQueries({ queryKey: ['my-provider'] });
    onUpdate?.();
    setSaving(false);
    setPendingPhotos({ photo_url_pending: '', photo_body_url_pending: '' });
    toast.success('Fotos enviadas! Aguarde aprovação do administrador.');
  };

  const hasNewPhotos = !!(pendingPhotos.photo_url_pending || pendingPhotos.photo_body_url_pending);

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
        <p className="text-xs text-amber-800 font-semibold">
          📸 As fotos precisam ser aprovadas pelo administrador antes de ficarem visíveis para os clientes.
        </p>
      </div>

      {provider.photos_pending_review && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-600 flex-shrink-0" />
          <p className="text-xs text-orange-800 font-semibold">Você tem fotos aguardando aprovação do admin.</p>
        </div>
      )}

      <PhotoUploadCard
        label="Foto de rosto"
        icon={User}
        currentUrl={provider.photo_url}
        pendingUrl={pendingPhotos.photo_url_pending || provider.photo_url_pending}
        description="Foto clara do seu rosto, preferencialmente fundo neutro."
        onUploaded={(url) => setPendingPhotos(p => ({ ...p, photo_url_pending: url }))}
      />

      <PhotoUploadCard
        label="Foto de corpo inteiro"
        icon={UserCheck}
        currentUrl={provider.photo_body_url}
        pendingUrl={pendingPhotos.photo_body_url_pending || provider.photo_body_url_pending}
        description="Foto com uniforme ou roupa de trabalho, corpo inteiro visível."
        onUploaded={(url) => setPendingPhotos(p => ({ ...p, photo_body_url_pending: url }))}
      />

      {hasNewPhotos && (
        <Button
          className="w-full rounded-2xl h-12 font-bold bg-primary text-primary-foreground"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Enviando...</>
          ) : (
            <><CheckCircle2 className="w-4 h-4 mr-2" /> Enviar para aprovação</>
          )}
        </Button>
      )}
    </div>
  );
}