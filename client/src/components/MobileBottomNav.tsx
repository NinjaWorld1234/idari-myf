import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Receipt, MoreHorizontal, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import QuickAddMenu from './QuickAddMenu';

const MobileBottomNav = () => {
    const { logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const tabs = [
        { to: '/', icon: LayoutDashboard, label: 'الرئيسية' },
        { to: '/members', icon: Users, label: 'الأعضاء' },
        { to: '/finance', icon: Receipt, label: 'العمليات' }, // Renamed/re-purposed
        { to: '/settings', icon: MoreHorizontal, label: 'المزيد' },
    ];

    return (
        <>
            {/* Bottom Tab Bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex justify-around items-center h-16 px-2 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                {tabs.map((tab) => (
                    <NavLink
                        key={tab.to}
                        to={tab.to}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${isActive ? 'text-emerald-600' : 'text-gray-400'
                            }`
                        }
                    >
                        <tab.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                        <span className="text-[10px] font-bold">{tab.label}</span>
                    </NavLink>
                ))}
            </div>

            {/* Quick Add Floating Button (FAB) */}
            <div className="md:hidden fixed bottom-20 left-4 z-50">
                <button
                    className="w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
                    onClick={() => setIsMenuOpen(true)}
                >
                    <Plus size={28} />
                </button>
            </div>

            <QuickAddMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        </>
    );
};

export default MobileBottomNav;
