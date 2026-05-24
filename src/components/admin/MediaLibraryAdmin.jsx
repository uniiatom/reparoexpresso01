import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Images, Search, Upload, Loader2, Copy, Trash2, RefreshCw, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { syncStorageImagesToMediaLibrary } from '@/lib/mediaLibrary';

function formatFileSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaLibraryAdmin() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const { data: items = [], isLoading } = useMediaLibrary(search);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      await base44.integrations.Core.UploadFile({ file, source: 'biblioteca' });
      qc.invalidateQueries({ queryKey: ['media-library'] });
      toast.success('Imagem adicionada à biblioteca.');
    } catch (err) {
      toast.error(err.message || 'Falha no upload.');
    } finally {
      setUploading(false);
    }
  };

  const syncMutation = useMutation({
    mutationFn: syncStorageImagesToMediaLibrary,
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['media-library'] });
      toast.success(`${count} imagem(ns) sincronizada(s) do storage.`);
    },
    onError: (err) => toast.error(err.message || 'Erro ao sincronizar.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MediaLibrary.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media-library'] });
      toast.success('Imagem removida da biblioteca.');
    },
    onError: () => toast.error('Erro ao remover imagem.'),
  });

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL copiada!');
    } catch {
      toast.error('Não foi possível copiar a URL.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-amber-400/15 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_45%),linear-gradient(135deg,rgba(24,24,27,0.95),rgba(9,9,11,0.98))] p-6">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-amber-400/90 text-xs font-bold uppercase tracking-[0.18em] mb-2">
              <Images className="w-4 h-4" />
              Mídia
            </div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Biblioteca</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Todas as imagens enviadas pelo sistema ficam aqui. Use nos serviços, cadastros e demais telas.
            </p>
          </div>
          <div className="inline-flex items-baseline gap-2 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-2.5">
            <span className="text-3xl font-bold tabular-nums text-amber-300 leading-none">{items.length}</span>
            <span className="text-sm font-medium text-amber-100/90">imagens</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Buscar por nome, URL ou origem..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-10 rounded-xl border-white/10 bg-zinc-900/50"
          />
          {search.trim() && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-400/30 bg-amber-400/10 cursor-pointer hover:bg-amber-400/15 transition-colors">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span className="text-sm font-medium">Enviar imagem</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                files.forEach((file) => handleUpload(file));
                e.target.value = '';
              }}
            />
          </label>
          <Button
            variant="outline"
            className="rounded-xl border-white/10"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
              : <RefreshCw className="w-4 h-4 mr-2" />}
            Sincronizar antigas
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <Images className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Biblioteca vazia</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Envie uma imagem ou clique em &quot;Sincronizar antigas&quot; para importar arquivos já existentes no storage.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60"
            >
              <div className="aspect-square overflow-hidden bg-zinc-900">
                <img
                  src={item.file_url}
                  alt={item.file_name || 'Imagem'}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-3 space-y-2">
                <p className="text-xs font-medium text-foreground truncate" title={item.file_name}>
                  {item.file_name || 'Sem nome'}
                </p>
                <div className="flex flex-wrap gap-1">
                  {item.source && (
                    <Badge variant="secondary" className="text-[10px]">{item.source}</Badge>
                  )}
                  <Badge variant="outline" className="text-[10px]">{formatFileSize(item.file_size)}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => copyUrl(item.file_url)}
                    aria-label="Copiar URL"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(item.id)}
                    aria-label="Remover da biblioteca"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
