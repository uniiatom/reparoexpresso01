import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2, Search, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';

export default function MediaLibraryPickerDialog({ open, onOpenChange, onSelect }) {
  const [search, setSearch] = useState('');
  const { data: items = [], isLoading } = useMediaLibrary(search);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl flex flex-col">
        <DialogHeader>
          <DialogTitle>Escolher da Biblioteca</DialogTitle>
        </DialogHeader>

        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar imagem..."
            className="pl-10 rounded-xl"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
            Nenhuma imagem na biblioteca ainda.
          </div>
        ) : (
          <div className="overflow-y-auto pr-1 -mr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect?.(item)}
                  className={cn(
                    'group relative aspect-square overflow-hidden rounded-xl border border-white/10',
                    'hover:border-amber-400/50 hover:ring-2 hover:ring-amber-400/30 transition-all',
                  )}
                >
                  <img
                    src={item.file_url}
                    alt={item.file_name || 'Imagem'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-zinc-200 truncate">{item.file_name || 'Sem nome'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
