import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function FavoriteButton({ providerId, providerName, providerData, size = "md", variant = "default" }) {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => {});
  }, []);

  // Verificar se já é favorito
  const { data: isFavorited, isLoading } = useQuery({
    queryKey: ['is-favorited', user?.id, providerId],
    queryFn: async () => {
      if (!user?.id) return false;
      const favorites = await base44.entities.Favorite.filter({
        client_id: user.id,
        provider_id: providerId,
      });
      return favorites.length > 0;
    },
    enabled: !!user?.id,
  });

  // Mutation para adicionar/remover favorito
  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (!user?.id || !providerId) return;

      if (isFavorited) {
        // Remover favorito
        const favorites = await base44.entities.Favorite.filter({
          client_id: user.id,
          provider_id: providerId,
        });
        if (favorites.length > 0) {
          await base44.entities.Favorite.delete(favorites[0].id);
        }
      } else {
        // Adicionar favorito
        await base44.entities.Favorite.create({
          client_id: user.id,
          client_email: user.email,
          provider_id: providerId,
          provider_name: providerData?.name || providerName,
          provider_photo_url: providerData?.photo_url,
          provider_rating: providerData?.rating,
          provider_city: providerData?.city,
          provider_state: providerData?.state,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-favorited', user?.id, providerId] });
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
      toast.success(isFavorited ? 'Removido dos favoritos' : 'Adicionado aos favoritos!');
    },
  });

  if (!user) return null;

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const buttonClasses = {
    default: 'p-2 hover:bg-accent rounded-lg transition-colors',
    primary: 'p-3 bg-primary text-primary-foreground rounded-2xl transition-colors hover:bg-primary/90',
    outline: 'p-2 border border-border rounded-lg hover:bg-accent transition-colors',
  };

  return (
    <button
      onClick={() => toggleFavorite.mutate()}
      disabled={isLoading || toggleFavorite.isPending}
      className={buttonClasses[variant]}
      title={isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
    >
      <Heart
        className={cn(
          sizeClasses[size],
          'transition-all',
          isFavorited
            ? 'text-red-500 fill-red-500'
            : 'text-muted-foreground'
        )}
      />
    </button>
  );
}