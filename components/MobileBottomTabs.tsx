import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, MoreHorizontal, Plus, Wallet, ArrowLeftRight, UserPlus, Receipt, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

import ExpenseRecordingModal from './ExpenseRecordingModal';
import PettyCashModal from './PettyCashModal';
import IncomeRecordingModal from './IncomeRecordingModal';
import TransferRecordingModal from './TransferRecordingModal';
import CollectSubscriptionModal from './CollectSubscriptionModal';

const MobileBottomTabs = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Modals State
    const [activeModal, setActiveModal] = useState<'EXPENSE' | 'PETTY_CASH' | 'INCOME' | 'TRANSFER' | 'COLLECT_SUB' | null>(null);

    const tabs = [
        { to: '/', icon: LayoutDashboard, label: 'الرئيسية' },
        { to: '/members', icon: Users, label: 'الأعضاء' },
        { to: '/finance', icon: CreditCard, label: 'العمليات' },
        { to: '/settings', icon: MoreHorizontal, label: 'المزيد' },
    ];

    const quickActions = [
        { id: 'SUB', icon: Receipt, label: 'تحصيل اشتراك', color: 'bg-emerald-500', action: () => { setActiveModal('COLLECT_SUB'); setIsMenuOpen(false); } },
        { id: 'INC', icon: Receipt, label: 'إيراد آخر', color: 'bg-emerald-400', action: () => { setActiveModal('INCOME'); setIsMenuOpen(false); } },
        { id: 'EXP', icon: Wallet, label: 'مصروف', color: 'bg-red-500', action: () => { setActiveModal('EXPENSE'); setIsMenuOpen(false); } },
        { id: 'PC', icon: Wallet, label: 'عهدة / تسوية', color: 'bg-amber-500', action: () => { setActiveModal('PETTY_CASH'); setIsMenuOpen(false); } },
        { id: 'TRANS', icon: ArrowLeftRight, label: 'تحويل', color: 'bg-indigo-500', action: () => { setActiveModal('TRANSFER'); setIsMenuOpen(false); } },
        { id: 'NEW', icon: UserPlus, label: 'عضو جديد', color: 'bg-purple-500', action: () => { navigate('/members', { state: { openAdd: true } }); setIsMenuOpen(false); } },
    ];

    const visibleTabs = tabs.filter(tab => {
        if (tab.to === '/settings' && user?.role === UserRole.ACCOUNTANT) return false;
        return true;
    });

    const visibleQuickActions = quickActions.filter(action => {
        if (action.id === 'NEW' && user?.role === UserRole.ACCOUNTANT) return false;
        return true;
    });

    return (
        <div className="md:hidden print:hidden">
            {/* Quick Action Bottom Sheet Overlay */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity animate-in fade-in"
                    onClick={() => setIsMenuOpen(false)}
                >
                    <div
                        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
                        <h3 className="text-xl font-black text-center mb-8 text-gray-800">إجراء سريع</h3>
                        <div className="grid grid-cols-4 gap-y-8 gap-x-4">
                            {visibleQuickActions.map((action, idx) => (
                                <button
                                    key={action.id}
                                    className="flex flex-col items-center gap-2 group"
                                    onClick={() => action.action && action.action()}
                                >
                                    <div className={`w-14 h-14 ${action.color} text-white rounded-2xl flex items-center justify-center shadow-lg group-active:scale-90 transition-transform`}>
                                        <action.icon size={28} />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-600 text-center whitespace-nowrap">{action.label}</span>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setIsMenuOpen(false)}
                            className="w-full mt-10 py-4 font-black text-gray-400 border-2 border-gray-100 rounded-2xl active:bg-gray-50 transition-colors"
                        >
                            إغلاق
                        </button>
                    </div>
                </div>
            )}

            {/* Bottom Tab Bar */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-[90] h-20 px-4 flex items-center justify-around pb-safe">
                {visibleTabs.slice(0, 2).map((tab) => (
                    <NavLink
                        key={tab.to}
                        to={tab.to}
                        className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-emerald-600 scale-110' : 'text-gray-400'}`}
                    >
                        {({ isActive }) => (
                            <>
                                <tab.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="text-[10px] font-black">{tab.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}

                {/* FAB */}
                <div className="relative -top-8">
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white active:scale-90 active:bg-emerald-700 transition-all"
                    >
                        <Plus size={32} strokeWidth={3} />
                    </button>
                </div>

                {visibleTabs.slice(2).map((tab) => (
                    <NavLink
                        key={tab.to}
                        to={tab.to}
                        className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-emerald-600 scale-110' : 'text-gray-400'}`}
                    >
                        {({ isActive }) => (
                            <>
                                <tab.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="text-[10px] font-black">{tab.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Modals placed at root level of the layout */}
            <ExpenseRecordingModal
                isOpen={activeModal === 'EXPENSE'}
                onClose={() => setActiveModal(null)}
            />

            <PettyCashModal
                isOpen={activeModal === 'PETTY_CASH'}
                onClose={() => setActiveModal(null)}
            />

            <IncomeRecordingModal
                isOpen={activeModal === 'INCOME'}
                onClose={() => setActiveModal(null)}
            />

            <TransferRecordingModal
                isOpen={activeModal === 'TRANSFER'}
                onClose={() => setActiveModal(null)}
            />

            <CollectSubscriptionModal
                isOpen={activeModal === 'COLLECT_SUB'}
                onClose={() => setActiveModal(null)}
            />
        </div>
    );
};

export default MobileBottomTabs;
