import React, { useState, useEffect, useMemo } from 'react';
import { X, CheckCircle, AlertCircle, Search, Camera, Calendar } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { TransactionType, TransactionDirection, TransactionStatus } from '../types';

interface CollectSubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    memberId?: string;
}

const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const CollectSubscriptionModal = ({ isOpen, onClose, memberId: initialMemberId }: CollectSubscriptionModalProps) => {
    const { members, financialMedia, addTransaction, transactions } = useApp();
    const [selectedMemberId, setSelectedMemberId] = useState(initialMemberId || '');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState<{ m: number; y: number } | null>(null);
    const [mediumId, setMediumId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);

    const selectedMember = members.find(m => m.id === selectedMemberId);
    const filteredMembers = members.filter(m =>
        m.fullName.includes(searchTerm) || m.memberCode.includes(searchTerm)
    ).slice(0, 5);

    // Get the member's subscription amount
    const memberAmount = selectedMember?.monthlySubscription ?? 20;
    const isFree = memberAmount === 0;

    // Calculate unpaid months starting from member's joinDate
    const unpaidMonths = useMemo(() => {
        if (!selectedMember) return [];
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        // Start from the member's join date
        const joinDate = new Date(selectedMember.joinDate);
        const startYear = joinDate.getFullYear();
        const startMonth = joinDate.getMonth() + 1;

        // Get all paid periods
        const paidPeriods = new Set<string>();
        transactions.forEach(t => {
            if (
                t.memberId === selectedMemberId &&
                t.type === TransactionType.SUBSCRIPTION &&
                t.status !== TransactionStatus.REVERSED
            ) {
                // Extract m/y from description
                const match = t.description?.match(/(\d+)\/(\d+)/);
                if (match) {
                    paidPeriods.add(`${parseInt(match[1])}/${parseInt(match[2])}`);
                }
            }
        });

        const result: { m: number; y: number; isPaid: boolean }[] = [];
        for (let y = startYear; y <= currentYear; y++) {
            const sM = y === startYear ? startMonth : 1;
            const eM = y === currentYear ? currentMonth : 12;
            for (let m = sM; m <= eM; m++) {
                const isPaid = paidPeriods.has(`${m}/${y}`);
                if (!isPaid) {
                    result.push({ m, y, isPaid: false });
                }
            }
        }
        return result;
    }, [selectedMember, selectedMemberId, transactions]);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setSelectedMemberId(initialMemberId || '');
            setSearchTerm('');
            setSelectedPeriod(null);
            setMediumId('');
            setDate(new Date().toISOString().split('T')[0]);
            setError('');
            setAttachment(null);
        }
    }, [isOpen, initialMemberId]);

    // Auto-select first unpaid period when member changes
    useEffect(() => {
        if (unpaidMonths.length > 0 && !selectedPeriod) {
            setSelectedPeriod(unpaidMonths[0]);
        }
    }, [unpaidMonths, selectedPeriod]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAttachment(e.target.files[0]);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMemberId || !selectedPeriod || !mediumId) {
            setError('يرجى اختيار العضو والفترة والخزينة');
            return;
        }
        if (isFree) {
            setError('هذا العضو معفى من الاشتراك (مجاني)');
            return;
        }

        setIsSubmitting(true);
        setError('');
        const periodLabel = `${selectedPeriod.m}/${selectedPeriod.y}`;
        try {
            await addTransaction({
                type: TransactionType.SUBSCRIPTION,
                direction: TransactionDirection.IN,
                amount: memberAmount,
                mediumId,
                memberId: selectedMemberId,
                date,
                description: `تحصيل اشتراك شهري - ${selectedMember?.fullName} - شهر ${periodLabel}`,
                category: 'اشتراكات أعضاء',
                paymentMethod: financialMedia.find(m => m.id === mediumId)?.name || 'نقدي',
                attachmentUrl: attachment ? URL.createObjectURL(attachment) : undefined,
                isSubscriptionPayment: true
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
                <div className="p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black text-gray-800">تحصيل اشتراك</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={24} className="text-gray-400" />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 rounded-2xl flex items-center gap-3 text-red-600 border border-red-100">
                            <AlertCircle size={20} />
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Member Search */}
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
                                                    setSelectedPeriod(null);
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

                        {/* Selected Member Info */}
                        {selectedMember && (
                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-xs text-emerald-600 font-bold">العضو المختار</p>
                                        <p className="font-black text-emerald-900">{selectedMember.fullName}</p>
                                    </div>
                                    {!initialMemberId && (
                                        <button type="button" className="text-xs font-bold text-emerald-600 underline"
                                            onClick={() => { setSelectedMemberId(''); setSearchTerm(''); setSelectedPeriod(null); }}>تغيير</button>
                                    )}
                                </div>
                                <div className="mt-2 flex items-center gap-3">
                                    <span className="text-xs font-bold text-gray-500">الاشتراك الشهري:</span>
                                    <span className={`text-sm font-black ${isFree ? 'text-green-600' : 'text-emerald-700'}`}>
                                        {isFree ? 'مجاني (معفى)' : `₪ ${memberAmount}`}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Free member notice */}
                        {selectedMember && isFree && (
                            <div className="p-4 bg-green-50 rounded-2xl border border-green-200 text-center">
                                <p className="font-black text-green-700">هذا العضو معفى من الاشتراكات الشهرية</p>
                                <p className="text-xs text-green-600 mt-1">لا يتطلب تحصيل اشتراك</p>
                            </div>
                        )}

                        {/* Unpaid Months Grid */}
                        {selectedMember && !isFree && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-black text-gray-700 flex items-center gap-2">
                                        <Calendar size={16} className="text-red-500" />
                                        الدفعات المستحقة ({unpaidMonths.length})
                                    </label>
                                    {unpaidMonths.length === 0 ? (
                                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                                            <CheckCircle size={24} className="text-emerald-600 mx-auto mb-2" />
                                            <p className="font-black text-emerald-700 text-sm">لا توجد دفعات مستحقة - العضو ملتزم بالسداد ✅</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-2 max-h-[150px] overflow-y-auto">
                                            {unpaidMonths.map(p => (
                                                <button
                                                    key={`${p.m}-${p.y}`}
                                                    type="button"
                                                    onClick={() => setSelectedPeriod(p)}
                                                    className={`p-2 rounded-xl border-2 transition-all text-center ${selectedPeriod?.m === p.m && selectedPeriod?.y === p.y
                                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md'
                                                            : 'border-red-100 bg-red-50/50 text-red-700 hover:border-red-300'
                                                        }`}
                                                >
                                                    <p className="text-[10px] font-bold">{MONTH_NAMES[p.m - 1]}</p>
                                                    <p className="text-xs font-black">{p.m}/{p.y}</p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Amount & Date */}
                                {unpaidMonths.length > 0 && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-black text-gray-700 block mr-1">المبلغ (₪)</label>
                                                <div className="w-full px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl font-black text-lg text-emerald-700 text-center">
                                                    {memberAmount}
                                                </div>
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

                                        {/* Payment Medium */}
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

                                        {/* Attachment */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-black text-gray-700 block mr-1 text-red-500">إرفاق صورة الإيصال (اختياري)</label>
                                            <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 hover:bg-emerald-50 hover:border-emerald-300 transition-all cursor-pointer group">
                                                <div className="flex flex-col items-center justify-center py-3">
                                                    <Camera className="w-6 h-6 text-gray-400 group-hover:text-emerald-500 mb-1" />
                                                    <p className="text-xs text-gray-500 group-hover:text-emerald-600 font-bold">
                                                        {attachment ? attachment.name : 'اضغط للتصوير أو اختيار صورة'}
                                                    </p>
                                                </div>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                            </label>
                                        </div>

                                        {/* Submit Buttons */}
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <button type="button" onClick={onClose}
                                                className="py-4 border-2 border-gray-100 text-gray-400 rounded-2xl font-black active:bg-gray-50 transition-all">
                                                إلغاء
                                            </button>
                                            <button type="submit" disabled={isSubmitting || !selectedPeriod}
                                                className="py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                                {isSubmitting ? (
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <>
                                                        <CheckCircle size={20} />
                                                        حفظ وتحصيل
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        {/* Buttons for free members or no member selected */}
                        {(!selectedMember || isFree) && (
                            <div className="mt-4">
                                <button type="button" onClick={onClose}
                                    className="w-full py-4 border-2 border-gray-100 text-gray-400 rounded-2xl font-black active:bg-gray-50 transition-all">
                                    إغلاق
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CollectSubscriptionModal;
