import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Star, MapPin, MessageCircle, X } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function PhotoZoom({ src, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-xs w-full" onClick={e => e.stopPropagation()}>
        <img src={src} alt="Foto" className="w-full rounded-2xl object-contain max-h-[80vh]" />
        <button onClick={onClose} className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>,
    document.body
  );
}

export default function FavoritesList() {
  const [user, setUser] = useState(null);
  const [zoomedPhoto, setZoomedPhoto] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => {});
  }, []);

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: () => base44.entities.Favorite.filter({ client_id: user?.id }),
    enabled: !!user?.id,
  });

  if (!user) return null;

  if (favorites.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card rounded-3xl p-8 border border-border text-center"
      >
        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">💔</span>
        </div>
        <p className="text-foreground font-semibold mb-1">Nenhum favorito ainda</p>
        <p className="text-sm text-muted-foreground">Marque seus prestadores preferidos para acesso rápido</p>
      </motion.div>
    );
  }

  return (
    <>
      {zoomedPhoto && <PhotoZoom src={zoomedPhoto} onClose={() => setZoomedPhoto(null)} />}
    <div className="space-y-3">
      {favorites.map((fav, idx) => (
        <motion.div
          key={fav.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all"
        >
          <div className="flex items-start gap-3 p-4">
            {/* Foto - clicável para zoom */}
            <div
              className={cn("w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden relative group", fav.provider_photo_url && "cursor-zoom-in")}
              onClick={fav.provider_photo_url ? () => setZoomedPhoto(fav.provider_photo_url) : undefined}
            >
              {fav.provider_photo_url ? (
                <>
                  <img src={fav.provider_photo_url} alt={fav.provider_name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-white text-lg">🔍</span>
                  </div>
                </>
              ) : (
                <span className="text-xl font-bold text-primary">{fav.provider_name?.charAt(0)}</span>
              )}
            </div>

            {/* Info - clicável para ir ao perfil */}
            <Link to={`/prestador/${fav.provider_id}`} className="flex-1">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-semibold text-foreground">{fav.provider_name}</h3>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-bold text-foreground">
                    {fav.provider_rating?.toFixed(1) || 'N/A'}
                  </span>
                </div>
              </div>
              {fav.provider_city && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3" /> {fav.provider_city}, {fav.provider_state}
                </p>
              )}
            </Link>
          </div>

          {/* Action */}
          <div className="border-t border-border px-4 py-3 bg-muted/50 flex justify-end">
            <button className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm font-semibold">
              <MessageCircle className="w-4 h-4" /> Contactar
            </button>
          </div>
        </motion.div>
      ))}
    </div>
    </>
  );
}