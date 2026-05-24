import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import RadialMenu from './RadialMenu';
import GlobalAdminSidebar from './GlobalAdminSidebar';
import StaffAreaGuard from '@/components/auth/StaffAreaGuard';
import { useAuth } from '@/lib/AuthContext';
import { ROLES, hasAnyRole } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';

export default function AppLayout() {
  const { user } = useAuth();
  const isStaff = hasAnyRole(user, [ROLES.ADMIN, ROLES.ATTENDANT]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      {isStaff && (
        <GlobalAdminSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      )}
      <main
        className={cn(
          'flex-1 pb-28 transition-[padding] duration-200',
          isStaff && (sidebarOpen ? 'pl-[236px]' : 'pl-14'),
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
