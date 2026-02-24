import React from 'react';
import { Transaction, AppSettings, FinancialMedium, Member, TransactionType } from '../types';
import { Printer, X } from 'lucide-react';

interface VoucherPrintProps {
    transaction: Transaction;
    settings: AppSettings;
    medium?: FinancialMedium;
    member?: Member;
    onClose: () => void;
}

const VoucherPrint = ({ transaction, settings, medium, member, onClose }: VoucherPrintProps) => {
    const isIncome = transaction.direction === 'وارد';

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-[200] bg-white overflow-y-auto pt-10 pb-20 print:pt-0 print:pb-0">
            {/* Control Bar (Hidden on Print) */}
            <div className="fixed top-0 left-0 right-0 bg-gray-900 text-white p-4 flex justify-between items-center z-[210] print:hidden">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
                        <X size={20} />
                    </button>
                    <span className="font-black">معاينة السند المحاسبي</span>
                </div>
                <button
                    onClick={handlePrint}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-black flex items-center gap-2 transition-all shadow-lg active:scale-95"
                >
                    <Printer size={18} /> طباعة السند (PDF)
                </button>
            </div>

            {/* Printable Area */}
            <div className="max-w-4xl mx-auto bg-white p-12 print:p-0">
                {/* Header Block */}
                <div className="flex justify-between items-start border-b-4 border-gray-900 pb-6 mb-8">
                    <div className="flex items-center gap-6">
                        {settings.logoUrl && (
                            <img src={settings.logoUrl} alt="Logo" className="w-24 h-24 object-contain" />
                        )}
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 leading-tight">
                                {settings.organizationName || 'اسم الجمعية'}
                            </h1>
                            {settings.registrationNumber && (
                                <p className="text-sm text-gray-600 font-bold mt-1">رقم الترخيص: {settings.registrationNumber}</p>
                            )}
                        </div>
                    </div>
                    <div className="text-left">
                        <div className="bg-gray-900 text-white px-6 py-2 rounded-lg mb-2 text-center">
                            <span className="text-xl font-black uppercase tracking-widest leading-loose">
                                {transaction.type === TransactionType.PETTY_CASH ? 'سند صرف عهدة' :
                                    transaction.type === TransactionType.PETTY_CASH_SETTLEMENT ? 'سند تسوية عهدة' :
                                        isIncome ? 'سند قبض' : 'سند صرف'}
                            </span>
                        </div>
                        <p className="font-black text-gray-800" dir="ltr">No: {transaction.voucherNumber || '------'}</p>
                        <p className="text-sm font-bold text-gray-500 mt-1">Date: {new Date(transaction.date).toLocaleDateString('ar-EG')}</p>
                    </div>
                </div>

                {/* Voucher Content */}
                <div className="space-y-10 font-bold text-gray-800">

                    <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                        <span className="shrink-0 text-gray-400 font-black">
                            {isIncome ? 'وصلنا من السادة:' : 'اصرفوا للسادة:'}
                        </span>
                        <span className="flex-1 text-xl font-black border-dashed border-b border-gray-300 pb-1">
                            {member?.fullName || '---'}
                        </span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 bg-gray-50 px-6 py-4 rounded-3xl border-2 border-gray-900">
                            <span className="text-gray-500 font-black">المبلغ:</span>
                            <span className="text-3xl font-black" dir="ltr">₪ {transaction.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex-1 border-b border-dashed border-gray-300 py-4 flex items-center gap-4">
                            <span className="text-gray-400 font-black">فقط وقدره:</span>
                            <span className="italic text-gray-600 uppercase">
                                {transaction.amount.toLocaleString()} شيكل لا غير.
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <span className="shrink-0 text-gray-400 font-black mt-1">وذلك عن:</span>
                            <div className="flex-1 min-h-[80px] border border-gray-200 rounded-2xl p-4 bg-gray-50/30 font-bold text-gray-700">
                                {transaction.description || transaction.category}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12 mt-16 pt-10">
                        <div className="space-y-2 border-t-2 border-gray-100 pt-4 flex flex-col items-center">
                            <span className="text-gray-400 font-black">توقيع المستلم</span>
                            <div className="h-20 w-full"></div>
                            <div className="text-sm text-gray-300">------------------------</div>
                        </div>
                        <div className="space-y-2 border-t-2 border-gray-100 pt-4 flex flex-col items-center">
                            <span className="text-gray-400 font-black">أمين الصندوق / المحاسب</span>
                            <div className="h-20 w-full flex items-center justify-center opacity-10 italic text-[10px]">
                                MYF SYSTEM AUTOMATED VOUCHER
                            </div>
                            <div className="text-sm text-gray-800 font-black">{transaction.createdBy ? 'معتمد إلكترونياً' : '------------------------'}</div>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-20 pt-8 border-t border-gray-200 grid grid-cols-3 gap-4 text-[10px] text-gray-400 font-bold">
                    <div className="flex items-center gap-1">{settings.phone && `هاتف: ${settings.phone}`}</div>
                    <div className="text-center">{settings.address}</div>
                    <div className="text-left">{settings.website}</div>
                </div>
            </div>
        </div>
    );
};

export default VoucherPrint;
