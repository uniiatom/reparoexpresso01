import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ROLES, hasAnyRole } from '@/lib/auth/roles';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function GlobalAdminSidebar({ open, onOpenChange }) {
  const { user } = useAuth();

  const isAdmin = hasAnyRole(user, [ROLES.ADMIN]);
  const isAttendant = hasAnyRole(user, [ROLES.ATTENDANT]);

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
      onToggle={() => onOpenChange?.((prev) => !prev)}
      pendingCount={pendingProviders.length}
      pendingPhotos={pendingPhotoProviders.length}
      role={isAttendant ? 'attendant' : 'admin'}
    />
  );
}
