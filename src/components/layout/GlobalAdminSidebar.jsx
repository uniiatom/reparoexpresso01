import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ROLES } from '@/lib/auth/roles';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function GlobalAdminSidebar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const isAdmin = user?.role === ROLES.ADMIN;
  const isAttendant = user?.role === ROLES.ATTENDANT;

  const { data: providers = [] } = useQuery({
    queryKey: ['sidebar-providers'],
    queryFn: () => base44.entities.Provider.list(),
    enabled: isAdmin,
    staleTime: 60_000,
  });

  if (!isAdmin && !isAttendant) return null;

  const pendingProviders = providers.filter(
    (p) => !p.is_approved && !p.is_blocked && !p.is_rejected,
  );
  const pendingPhotoProviders = providers.filter((p) => p.photos_pending_review);

  return (
    <AdminSidebar
      open={open}
      onToggle={() => setOpen((prev) => !prev)}
      pendingCount={pendingProviders.length}
      pendingPhotos={pendingPhotoProviders.length}
      role={isAttendant ? 'attendant' : 'admin'}
    />
  );
}
