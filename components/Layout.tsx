import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileBottomTabs from './MobileBottomTabs';

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <Sidebar />
      <main className="flex-1 md:mr-64 min-h-screen transition-all duration-300 pb-24 md:pb-8">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      <MobileBottomTabs />
    </div>
  );
};

export default Layout;