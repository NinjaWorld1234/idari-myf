import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { TransactionType, TransactionDirection, FinancialMediumType } from '../types';

interface CollectSubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    memberId?: string;
}

const CollectSubscriptionModal = ({ isOpen, onClose, memberId: initialMemberId }: CollectSubscriptionModalProps) => {
    const { members, financialMedia, subscriptionTypes, addTransaction } = useApp();
    const [selectedMemberId, setSelectedMemberId] = useState(initialMemberId || '');
    const [searchTerm, setSearchTerm] = useState('');
    const [subscriptionTypeId, setSubscriptionTypeId] = useState('');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [amount, setAmount] = useState<number>(0);
    const [mediumId, setMediumId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const selectedMember = members.find(m => m.id === selectedMemberId);
    const filteredMembers = members.filter(m =>
        m.fullName.includes(searchTerm) || m.memberCode.includes(searchTerm)
    ).slice(0, 5);

    useEffect(() => {
        if (selectedMember) {
            // Default to first subscription type or monthly if available
            if (subscriptionTypes.length > 0 && !subscriptionTypeId) {
                setSubscriptionTypeId(subscriptionTypes[0].id);
                setAmount(subscriptionTypes[0].amount);
            } else if (selectedMember.monthlySubscription && !subscriptionTypeId) {
                setAmount(selectedMember.monthlySubscription);
            }
        }
    }, [selectedMember, subscriptionTypes, subscriptionTypeId]);

    const handleSubscriptionTypeChange = (id: string) => {
        setSubscriptionTypeId(id);
        const type = subscriptionTypes.find(t => t.id === id);
        if (type) setAmount(type.amount);
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMemberId || !amount || !mediumId) {
            setError('يرجى إكمال جميع الحقول المطلوبة');
            return;
        }

        setIsSubmitting(true);
        setError('');
        try {
            await addTransaction({
                type: TransactionType.SUBSCRIPTION,
                direction: TransactionDirection.IN,
                amount,
                mediumId,
                memberId: selectedMemberId,
                date,
                description: description || `تحصيل اشتراك - ${selectedMember?.fullName} (${month}/${year})`,
                category: 'اشتراكات أعضاء',
                paymentMethod: financialMedia.find(m => m.id === mediumId)?.name || 'نقدي',
                attachmentUrl: attachment ? 'mock-url' : undefined // Handling real upload would be a next step
            });
            onClose();
        } catch (err: any) {
            setError(err.message || 'حدث خطأ أثناء الحفظ');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-white rounded-t-[32px] md:rounded-[24px] shadow-2xl overflow-hidden animate-slide-up">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black text-gray-800">تحصيل اشتراك</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={24} className="text-gray-400" />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 rounded-2xl flex items-center gap-3 text-red-600 border border-red-100 animate-shake">
                            <AlertCircle size={20} />
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Member Selection */}
                        {!initialMemberId && (
                            <div className="space-y-2">
                                <label className="text-sm font-black text-gray-700 block mr-1">البحث عن العضو</label>
                                <div className="relative">
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="اسم العضو أو رقم العضوية"
                                        className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                {searchTerm && filteredMembers.length > 0 && !selectedMemberId && (
                                    <div className="bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden">
                                        {filteredMembers.map(m => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                className="w-full p-4 text-right hover:bg-emerald-50 border-b border-gray-50 last:border-0 transition-colors flex justify-between items-center"
                                                onClick={() => {
                                                    setSelectedMemberId(m.id);
                                                    setSearchTerm(m.fullName);
                                                }}
                                            >
                                                <span className="font-bold">{m.fullName}</span>
                                                <span className="text-xs text-gray-400 font-bold">#{m.memberCode}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedMember && (
                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-emerald-600 font-bold">العضو المختار</p>
                                    <p className="font-black text-emerald-900">{selectedMember.fullName}</p>
                                </div>
                                {!initialMemberId && (
                                    <button
                                        type="button"
                                        className="text-xs font-bold text-emerald-600 underline"
                                        onClick={() => {
                                            setSelectedMemberId('');
                                            setSearchTerm('');
                                        }}
                                    >
                                        تغيير
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-black text-gray-700 block mr-1">نوع الاشتراك</label>
                                <select
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold appearance-none bg-chevron-down bg-no-repeat bg-[left_1rem_center]"
                                    value={subscriptionTypeId}
                                    onChange={(e) => handleSubscriptionTypeChange(e.target.value)}
                                >
                                    <option value="">اختر النوع...</option>
                                    {subscriptionTypes.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} (₪{t.amount})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-black text-gray-700 block mr-1">الفترة (شهر/سنة)</label>
                                <div className="flex gap-2">
                                    <select
                                        className="w-full px-2 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                                        value={month}
                                        onChange={(e) => setMonth(parseInt(e.target.value))}
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                    <select
                                        className="w-full px-2 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                                        value={year}
                                        onChange={(e) => setYear(parseInt(e.target.value))}
                                    >
                                        {[2024, 2025, 2026, 2027].map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-black text-gray-700 block mr-1">المبلغ (₪)</label>
                                <input
                                    required
                                    type="number"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-black text-lg text-emerald-700"
                                    value={amount || ''}
                                    onChange={(e) => setAmount(parseFloat(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-black text-gray-700 block mr-1">التاريخ</label>
                                <input
                                    required
                                    type="date"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-black text-gray-700 block mr-1">طريقة القبض (الخزينة)</label>
                            <div className="grid grid-cols-2 gap-3">
                                {financialMedia.map(m => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        className={`p-3 rounded-2xl border-2 transition-all text-center ${mediumId === m.id
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                            : 'border-gray-50 bg-gray-50 text-gray-500'
                                            }`}
                                        onClick={() => setMediumId(m.id)}
                                    >
                                        <p className="text-xs font-black">{m.name}</p>
                                        <p className="text-[10px] opacity-70" dir="ltr">₪ {m.balance.toLocaleString()}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-black text-gray-700 block mr-1">ملاحظات إضافية</label>
                            <textarea
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                                rows={2}
                                placeholder="مثال: اشتراك شهر 10 و 11"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-black text-gray-700 block mr-1">صورة إيصال (مرفق)</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    id="receipt-upload"
                                    onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                                />
                                <label
                                    htmlFor="receipt-upload"
                                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 border-dashed rounded-2xl text-gray-500 font-bold text-center cursor-pointer hover:bg-gray-100 transition-colors"
                                >
                                    {attachment ? attachment.name : 'اضغط لإضافة صورة إيصال'}
                                </label>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle size={20} />
                                    تأكيد عملية القبض
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CollectSubscriptionModal;
