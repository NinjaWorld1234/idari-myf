import React from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { NAV_ITEMS } from '../constants';

const Sidebar = () => {
  const { logout, user } = useAuth();
  const { appSettings } = useApp();

  // Filter items based on user role
  const navItems = NAV_ITEMS.filter(item => user && item.roles.includes(user.role));

  const activeClass = "flex items-center gap-3 px-4 py-3 bg-emerald-700 text-white rounded-lg transition-colors shadow-sm";
  const inactiveClass = "flex items-center gap-3 px-4 py-3 text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors";

  return (
    <aside className="w-64 bg-white h-screen flex flex-col border-l border-gray-200 fixed right-0 top-0 bottom-0 z-20 shadow-lg hidden md:flex print:hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col items-center">
        {appSettings.logoUrl ? (
          <img src={appSettings.logoUrl} alt="Logo" className="w-20 h-20 object-contain mb-3" />
        ) : (
          <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-3 shadow-md">
            م
          </div>
        )}
        <h1 className="text-lg font-bold text-emerald-900 text-center">{appSettings.organizationName || 'ملتقى الشباب المسلم'}</h1>
        <p className="text-xs text-gray-500 mt-1">نظام الإدارة الموحد</p>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => isActive ? activeClass : inactiveClass}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold">
            {user?.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-gray-800 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-bold"
        >
          <LogOut size={16} />
          تسجيل خروج
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;