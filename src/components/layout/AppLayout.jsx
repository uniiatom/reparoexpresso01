import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import RadialMenu from './RadialMenu';
import GlobalAdminSidebar from './GlobalAdminSidebar';
import { useAuth } from '@/lib/AuthContext';
import { ROLES } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';

export default function AppLayout() {
  const { user } = useAuth();
  const isStaff = user?.role === ROLES.ADMIN || user?.role === ROLES.ATTENDANT;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      {isStaff && <GlobalAdminSidebar />}
      <main className={cn('flex-1 pb-28', isStaff && 'pl-14')}>
        <Outlet />
      </main>
      <RadialMenu />
    </div>
  );
}
