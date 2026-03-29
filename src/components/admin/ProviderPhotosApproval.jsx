import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Camera, User, UserCheck } from "lucide-react";
import { toast } from 'sonner';

function PhotoCard({ label, pendingUrl, currentUrl, onApprove, onReject, loading }) {
  if (!pendingUrl) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
          {label === 'Rosto' ? <User className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />} {label}
        </p>
        <div className="w-full h-40 rounded-xl bg-muted flex items-center justify-center">
          <p className="text-xs text-muted-foreground">Sem alteração</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
        {label === 'Rosto' ? <User className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />} {label} (nova)
      </p>
      <div className="w-full h-40 rounded-xl bg-muted overflow-hidden">
        <img src={pendingUrl} alt={label} className="w-full h-full object-cover" />
      </div>

      {currentUrl && (
        <>
          <p className="text-xs text-muted-foreground font-semibold">{label} (atual)</p>
          <div className="w-full h-24 rounded-xl bg-muted overflow-hidden">
            <img src={currentUrl} alt={`${label} atual`} className="w-full h-full object-cover" />
          </div>
        </>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 rounded-xl border-destructive text-destructive hover:bg-destructive/5 text-xs"
          onClick={onReject}
          disabled={loading}
        >
          <XCircle className="w-3 h-3 mr-1" /> Rejeitar
        </Button>
        <Button
          size="sm"
          className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs"
          onClick={onApprove}
          disabled={loading}
        >
          <CheckCircle2 className="w-3 h-3 mr-1" /> Aprovar
        </Button>
      </div>
    </div>
  );
}

export default function ProviderPhotosApproval() {
  const queryClient = useQueryClient();
  const [loadingMap, setLoadingMap] = useState({});

  const { data: providers = [] } = useQuery({
    queryKey: ['providers-photos-pending'],
    queryFn: () => base44.entities.Provider.filter({ photos_pending_review: true }),
    refetchInterval: 15000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['providers-photos-pending'] });
    queryClient.invalidateQueries({ queryKey: ['all-providers'] });
  };

  const setLoading = (id, val) => setLoadingMap(m => ({ ...m, [id]: val }));

  const handleApproveFace = async (prov) => {
    setLoading(prov.id + '_face', true);
    await base44.entities.Provider.update(prov.id, {
      photo_url: prov.photo_url_pending,
      photo_url_pending: null,
      // Se não há mais nenhuma foto pendente, limpa o flag
      photos_pending_review: !!prov.photo_body_url_pending,
    });
    toast.success('Foto de rosto aprovada!');
    invalidate();
    setLoading(prov.id + '_face', false);
  };

  const handleRejectFace = async (prov) => {
    setLoading(prov.id + '_face', true);
    await base44.entities.Provider.update(prov.id, {
      photo_url_pending: null,
      photos_pending_review: !!prov.photo_body_url_pending,
    });
    toast.info('Foto de rosto rejeitada. Foto anterior mantida.');
    invalidate();
    setLoading(prov.id + '_face', false);
  };

  const handleApproveBody = async (prov) => {
    setLoading(prov.id + '_body', true);
    await base44.entities.Provider.update(prov.id, {
      photo_body_url: prov.photo_body_url_pending,
      photo_body_url_pending: null,
      photos_pending_review: !!prov.photo_url_pending,
    });
    toast.success('Foto de corpo aprovada!');
    invalidate();
    setLoading(prov.id + '_body', false);
  };

  const handleRejectBody = async (prov) => {
    setLoading(prov.id + '_body', true);
    await base44.entities.Provider.update(prov.id, {
      photo_body_url_pending: null,
      photos_pending_review: !!prov.photo_url_pending,
    });
    toast.info('Foto de corpo rejeitada. Foto anterior mantida.');
    invalidate();
    setLoading(prov.id + '_body', false);
  };

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

          <div className="grid grid-cols-2 gap-4">
            <PhotoCard
              label="Rosto"
              pendingUrl={prov.photo_url_pending}
              currentUrl={prov.photo_url}
              onApprove={() => handleApproveFace(prov)}
              onReject={() => handleRejectFace(prov)}
              loading={loadingMap[prov.id + '_face']}
            />
            <PhotoCard
              label="Corpo"
              pendingUrl={prov.photo_body_url_pending}
              currentUrl={prov.photo_body_url}
              onApprove={() => handleApproveBody(prov)}
              onReject={() => handleRejectBody(prov)}
              loading={loadingMap[prov.id + '_body']}
            />
          </div>
        </div>
      ))}
    </div>
  );
}