import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { NAV_ITEMS } from '../constants';

const MobileNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { logout, user } = useAuth();
  const { appSettings } = useApp();

  const toggle = () => setIsOpen(!isOpen);

  const navItems = NAV_ITEMS.filter(item => user && item.roles.includes(user.role));

  const activeClass = "flex items-center gap-3 px-4 py-3 bg-emerald-700 text-white rounded-lg transition-colors";
  const inactiveClass = "flex items-center gap-3 px-4 py-3 text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors";

  return (
    <div className="md:hidden print:hidden">
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-2">
          {appSettings.logoUrl ? (
            <img src={appSettings.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
          ) : (
            <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              م
            </div>
          )}
          <h1 className="font-bold text-emerald-900 text-sm truncate max-w-[150px]">{appSettings.organizationName || 'ملتقى الشباب'}</h1>
        </div>
        <button onClick={toggle} className="text-gray-600 p-2 hover:bg-gray-100 rounded-lg">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={toggle}>
          <div className="absolute top-0 right-0 bottom-0 w-3/4 max-w-xs bg-white shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 bg-emerald-600 text-white">
              <h2 className="font-bold text-lg mb-1">القائمة الرئيسية</h2>
              <p className="text-emerald-100 text-sm">{user?.name}</p>
            </div>
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) => isActive ? activeClass : inactiveClass}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => { logout(); setIsOpen(false); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-bold"
              >
                <LogOut size={16} />
                تسجيل خروج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileNav;