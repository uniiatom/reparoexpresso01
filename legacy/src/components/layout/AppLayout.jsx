import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import RadialMenu from './RadialMenu';
import GlobalAdminSidebar from './GlobalAdminSidebar';
import GlobalProviderSidebar from '@/components/providers/GlobalProviderSidebar';
import StaffAreaGuard from '@/components/auth/StaffAreaGuard';
import { useAuth } from '@/lib/AuthContext';
import { ROLES, hasAnyRole } from '@/lib/auth/roles';
import { isProviderAreaPath } from '@/lib/navigation/providerNavigation';
import { cn } from '@/lib/utils';

export default function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const isStaff = hasAnyRole(user, [ROLES.ADMIN, ROLES.ATTENDANT]);
  const isProvider = hasAnyRole(user, [ROLES.PROVIDER]) && !isStaff;
  const [adminSidebarOpen, setAdminSidebarOpen] = useState(true);
  const [providerSidebarOpen, setProviderSidebarOpen] = useState(false);

  const showProviderSidebar = isProvider && isProviderAreaPath(location.pathname);

  useEffect(() => {
    if (isProvider) setProviderSidebarOpen(false);
  }, [location.pathname, isProvider]);

  const hasAdminSidebar = isStaff;
  const hasSidebarPadding = hasAdminSidebar || showProviderSidebar;
  const sidebarExpanded = isStaff ? adminSidebarOpen : providerSidebarOpen;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      {hasAdminSidebar && (
        <GlobalAdminSidebar open={adminSidebarOpen} onOpenChange={setAdminSidebarOpen} />
      )}
      {showProviderSidebar && (
        <GlobalProviderSidebar open={providerSidebarOpen} onOpenChange={setProviderSidebarOpen} />
      )}
      <main
        className={cn(
          'flex-1 pb-28 transition-[padding] duration-200',
          hasSidebarPadding && (sidebarExpanded ? 'pl-[236px]' : 'pl-14'),
        )}
      >
        <StaffAreaGuard>
          <Outlet />
        </StaffAreaGuard>
      </main>
      <RadialMenu />
    </div>
  );
}
