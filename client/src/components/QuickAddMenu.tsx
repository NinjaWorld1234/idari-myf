import React, { useState } from 'react';
import { X, Receipt, TrendingDown, ArrowLeftRight, UserPlus, CreditCard } from 'lucide-react';
import CollectSubscriptionModal from './CollectSubscriptionModal';
import ExpenseRecordingModal from './ExpenseRecordingModal';
import InternalTransferModal from './InternalTransferModal';

interface QuickAddMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

const QuickAddMenu = ({ isOpen, onClose }: QuickAddMenuProps) => {
    const [activeModal, setActiveModal] = useState<'SUBSCRIPTION' | 'EXPENSE' | 'TRANSFER' | null>(null);

    if (!isOpen && !activeModal) return null;

    const handleAction = (type: string) => {
        switch (type) {
            case 'تحصيل اشتراك': setActiveModal('SUBSCRIPTION'); break;
            case 'تسجيل مصروف': setActiveModal('EXPENSE'); break;
            case 'تحويل بين حسابات': setActiveModal('TRANSFER'); break;
            default: break;
        }
    };

    const actions = [
        { label: 'تحصيل اشتراك', icon: Receipt, color: 'bg-emerald-100 text-emerald-600', subText: 'تسجيل دفعة اشتراك من عضو' },
        { label: 'إيراد آخر', icon: CreditCard, color: 'bg-blue-100 text-blue-600', subText: 'تبرعات أو موارد أخرى' },
        { label: 'تسجيل مصروف', icon: TrendingDown, color: 'bg-red-100 text-red-600', subText: 'دفع فواتير، رواتب، أو نثريات' },
        { label: 'عهدة (موظف)', icon: UserPlus, color: 'bg-amber-100 text-amber-600', subText: 'صرف مبلغ بعهدة موظف' },
        { label: 'تسوية عهدة', icon: Receipt, color: 'bg-indigo-100 text-indigo-600', subText: 'إغلاق عهدة موظف بموجب فواتير' },
        { label: 'تحويل داخلي', icon: ArrowLeftRight, color: 'bg-slate-100 text-slate-600', subText: 'بين الصندوق والبنك أو العكس' },
        { label: 'عضو جديد', icon: UserPlus, color: 'bg-emerald-100 text-emerald-600', subText: 'إضافة عضو جديد للنظام' },
    ];

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-[100] md:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                        onClick={onClose}
                    />

                    {/* Bottom Sheet */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] shadow-2xl animate-slide-up pb-10">
                        <div className="flex flex-col p-6">
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full self-center mb-6" />

                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-black text-gray-800">إضافة سريعة</h2>
                                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X size={24} className="text-gray-400" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {actions.map((action, idx) => (
                                    <button
                                        key={idx}
                                        className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-all border border-gray-50 text-right group"
                                        onClick={() => handleAction(action.label)}
                                    >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform`}>
                                            <action.icon size={24} />
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-800">{action.label}</p>
                                            <p className="text-xs text-gray-400 font-bold">{action.subText}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Actual Forms */}
            {activeModal === 'SUBSCRIPTION' && (
                <CollectSubscriptionModal isOpen={true} onClose={() => { setActiveModal(null); onClose(); }} />
            )}
            {activeModal === 'EXPENSE' && (
                <ExpenseRecordingModal isOpen={true} onClose={() => { setActiveModal(null); onClose(); }} />
            )}
            {activeModal === 'TRANSFER' && (
                <InternalTransferModal isOpen={true} onClose={() => { setActiveModal(null); onClose(); }} />
            )}
        </>
    );
};

export default QuickAddMenu;
