import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Camera, User, UserCheck } from "lucide-react";
import { toast } from 'sonner';

export default function ProviderPhotosApproval() {
  const queryClient = useQueryClient();

  const { data: providers = [] } = useQuery({
    queryKey: ['providers-photos-pending'],
    queryFn: () => base44.entities.Provider.filter({ photos_pending_review: true }),
    refetchInterval: 15000,
  });

  const approvePhotos = useMutation({
    mutationFn: async (provider) => {
      await base44.entities.Provider.update(provider.id, {
        photo_url: provider.photo_url_pending || provider.photo_url,
        photo_body_url: provider.photo_body_url_pending || provider.photo_body_url,
        photo_url_pending: null,
        photo_body_url_pending: null,
        photos_pending_review: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers-photos-pending'] });
      queryClient.invalidateQueries({ queryKey: ['all-providers'] });
      toast.success('Fotos aprovadas!');
    },
  });

  const rejectPhotos = useMutation({
    mutationFn: async (provider) => {
      await base44.entities.Provider.update(provider.id, {
        photo_url_pending: null,
        photo_body_url_pending: null,
        photos_pending_review: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers-photos-pending'] });
      toast.info('Fotos rejeitadas. As fotos antigas foram mantidas.');
    },
  });

  if (providers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-semibold">Nenhuma foto aguardando aprovação</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{providers.length} prestador(es) com fotos para aprovar</p>
      {providers.map(prov => (
        <div key={prov.id} className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary">
              {prov.name?.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-foreground">{prov.name}</p>
              <p className="text-xs text-muted-foreground">{prov.city} · {prov.phone}</p>
            </div>
            <span className="ml-auto text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded-lg">
              📷 Fotos pendentes
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Foto de rosto */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                <User className="w-3 h-3" /> Rosto (nova)
              </p>
              <div className="w-full h-40 rounded-xl bg-muted overflow-hidden flex items-center justify-center">
                {prov.photo_url_pending ? (
                  <img src={prov.photo_url_pending} alt="rosto" className="w-full h-full object-cover" />
                ) : (
                  <p className="text-xs text-muted-foreground">Sem alteração</p>
                )}
              </div>
              {prov.photo_url && prov.photo_url_pending && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground mt-2 mb-1">Rosto (atual)</p>
                  <div className="w-full h-24 rounded-xl bg-muted overflow-hidden">
                    <img src={prov.photo_url} alt="rosto atual" className="w-full h-full object-cover" />
                  </div>
                </>
              )}
            </div>

            {/* Foto de corpo */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                <UserCheck className="w-3 h-3" /> Corpo (nova)
              </p>
              <div className="w-full h-40 rounded-xl bg-muted overflow-hidden flex items-center justify-center">
                {prov.photo_body_url_pending ? (
                  <img src={prov.photo_body_url_pending} alt="corpo" className="w-full h-full object-cover" />
                ) : (
                  <p className="text-xs text-muted-foreground">Sem alteração</p>
                )}
              </div>
              {prov.photo_body_url && prov.photo_body_url_pending && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground mt-2 mb-1">Corpo (atual)</p>
                  <div className="w-full h-24 rounded-xl bg-muted overflow-hidden">
                    <img src={prov.photo_body_url} alt="corpo atual" className="w-full h-full object-cover" />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-xl border-destructive text-destructive hover:bg-destructive/5"
              onClick={() => rejectPhotos.mutate(prov)}
              disabled={rejectPhotos.isPending}
            >
              <XCircle className="w-4 h-4 mr-2" /> Rejeitar
            </Button>
            <Button
              className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold"
              onClick={() => approvePhotos.mutate(prov)}
              disabled={approvePhotos.isPending}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> Aprovar fotos
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}