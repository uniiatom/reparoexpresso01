import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import ServiceSidebar from './ServiceSidebar';

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <ServiceSidebar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}