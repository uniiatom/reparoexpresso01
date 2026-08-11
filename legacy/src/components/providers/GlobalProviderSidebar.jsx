import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { ROLES, hasAnyRole } from '@/lib/auth/roles';
import ProviderSidebar from '@/components/providers/ProviderSidebar';

export default function GlobalProviderSidebar({ open, onOpenChange }) {
  const { user } = useAuth();
  const isProvider = hasAnyRole(user, [ROLES.PROVIDER]);
  const isStaff = hasAnyRole(user, [ROLES.ADMIN, ROLES.ATTENDANT]);

  if (!isProvider || isStaff) return null;

  return (
    <ProviderSidebar
      open={open}
      onToggle={() => onOpenChange?.((prev) => !prev)}
    />
  );
}
