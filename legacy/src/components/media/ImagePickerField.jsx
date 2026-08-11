import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, Images, X, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import MediaLibraryPickerDialog from '@/components/media/MediaLibraryPickerDialog';

export default function ImagePickerField({
  value,
  onChange,
  label = 'Imagem',
  uploadSource = 'upload',
  className,
}) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({
        file,
        source: uploadSource,
      });
      onChange(file_url);
      queryClient.invalidateQueries({ queryKey: ['media-library'] });
      toast.success('Imagem enviada.');
    } catch (err) {
      toast.error(err.message || 'Falha no upload.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <Label>{label}</Label>

      {value ? (
        <div className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-zinc-950/80">
          <img
            src={value}
            alt="Prévia da imagem"
            className="w-full h-44 sm:h-52 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-zinc-900/90 border border-white/15"
            onClick={() => onChange('')}
            aria-label="Remover imagem"
          >
            <X className="w-4 h-4" />
          </Button>
          <p className="absolute bottom-3 left-3 right-3 text-[11px] text-zinc-300 truncate bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1">
            Miniatura ativa — visível para o cliente após salvar o serviço
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-zinc-950/40 h-44 sm:h-52 text-center px-4">
          <ImageIcon className="w-8 h-8 text-zinc-600" />
          <p className="text-sm text-muted-foreground">Nenhuma imagem selecionada</p>
          <p className="text-xs text-zinc-500">Envie um arquivo ou escolha da Biblioteca</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-white/15 cursor-pointer hover:bg-white/5 transition-colors">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span className="text-sm">{uploading ? 'Enviando...' : 'Enviar imagem'}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              handleUpload(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        <Button
          type="button"
          variant="outline"
          className="rounded-xl border-amber-400/30 hover:bg-amber-400/10"
          onClick={() => setLibraryOpen(true)}
        >
          <Images className="w-4 h-4 mr-2" />
          Biblioteca
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Ou cole a URL da imagem</Label>
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="rounded-xl text-xs font-mono"
        />
      </div>

      <MediaLibraryPickerDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onSelect={(item) => {
          onChange(item.file_url);
          setLibraryOpen(false);
          toast.success('Imagem selecionada da biblioteca.');
        }}
      />
    </div>
  );
}
