import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { User } from 'lucide-react';

export default function ProviderMiniPhoto({ providerId, size = 'md' }) {
  const { data: provider } = useQuery({
    queryKey: ['provider-mini', providerId],
    queryFn: () => base44.entities.Provider.filter({ id: providerId }).then(r => r[0]),
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000,
  });

  const sizeClass = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12';

  return (
    <div className={`${sizeClass} rounded-xl overflow-hidden bg-primary/10 border border-border flex items-center justify-center flex-shrink-0`}>
      {provider?.photo_url ? (
        <img src={provider.photo_url} alt={provider.name} className="w-full h-full object-cover" />
      ) : (
        <User className="w-5 h-5 text-primary/40" />
      )}
    </div>
  );
}