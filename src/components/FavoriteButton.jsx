import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function FavoriteButton({ providerId, providerName, providerData, size = "md", variant = "default" }) {
  const [user, setUser] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.id || !providerId) return;
    base44.entities.Favorite.filter({ client_id: user.id })
      .then(favs => {
        const match = favs.find(f => f.provider_id === providerId);
        if (match) {
          setIsFavorited(true);
          setFavoriteId(match.id);
        } else {
          setIsFavorited(false);
          setFavoriteId(null);
        }
      })
      .catch(() => {});
  }, [user?.id, providerId]);

  const handleToggle = async () => {
    if (!user?.id || !providerId || loading) return;
    setLoading(true);
    try {
      if (isFavorited && favoriteId) {
        await base44.entities.Favorite.delete(favoriteId);
        setIsFavorited(false);
        setFavoriteId(null);
        toast.success('Removido dos favoritos');
      } else {
        const created = await base44.entities.Favorite.create({
          client_id: user.id,
          client_email: user.email,
          provider_id: providerId,
          provider_name: providerData?.name || providerName,
          provider_photo_url: providerData?.photo_url || null,
          provider_rating: providerData?.rating || null,
          provider_city: providerData?.city || null,
          provider_state: providerData?.state || null,
        });
        setIsFavorited(true);
        setFavoriteId(created.id);
        toast.success('Adicionado aos favoritos!');
      }
    } catch (err) {
      toast.error('Erro ao salvar favorito: ' + (err?.message || 'tente novamente'));
    }
    setLoading(false);
  };

  if (!user) return null;

  const sizeClasses = { sm: 'w-5 h-5', md: 'w-6 h-6', lg: 'w-8 h-8' };
  const buttonClasses = {
    default: 'p-2 hover:bg-accent rounded-lg transition-colors',
    primary: 'p-3 bg-primary text-primary-foreground rounded-2xl transition-colors hover:bg-primary/90',
    outline: 'p-2 border border-border rounded-lg hover:bg-accent transition-colors',
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={buttonClasses[variant]}
      title={isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
    >
      <Heart
        className={cn(
          sizeClasses[size],
          'transition-all',
          isFavorited ? 'text-red-500 fill-red-500' : 'text-muted-foreground'
        )}
      />
    </button>
  );
}