import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Member, MembershipType, MemberStatus, UserRole,
  TransactionType, TransactionDirection, Gender,
  STATUS_LABELS, MEMBERSHIP_LABELS, GENDER_LABELS,
  TRANSACTION_TYPE_LABELS, DIRECTION_LABELS, Transaction
} from '../types';
import {
  Search, Plus, Filter, Trash2, Edit2, CreditCard, CheckCircle,
  AlertCircle, User, MessageCircle, FileSpreadsheet, Info, Eye, X,
  GraduationCap, XCircle, DollarSign, Calendar, Settings, Table,
  Download, Printer, Copy, Trash, Wallet, Receipt, ArrowDownLeft,
  ArrowUpRight, List, RotateCcw
} from 'lucide-react';
import { PALESTINIAN_CITIES } from '../constants';
import * as XLSX from 'xlsx';
import CollectSubscriptionModal from '../components/CollectSubscriptionModal';
import VoucherPrint from '../components/VoucherPrint';

const Members = () => {
  const {
    members, addMember, deleteMember, updateMember,
    transactions, addTransaction, appSettings, updateSettings,
    isLoading, financialMedia
  } = useApp();
  const { user } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [viewMember, setViewMember] = useState<Member | null>(null);
  const [detailTab, setDetailTab] = useState<'INFO' | 'SUBS' | 'TRANS'>('INFO');
  const [printingTransaction, setPrintingTransaction] = useState<Transaction | null>(null);

  // State for Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');

  // Form State
  const [formData, setFormData] = useState<Partial<Member>>({
    fullName: '',
    phone: '',
    whatsapp: '',
    city: 'نابلس',
    membershipType: MembershipType.MEMBER,
    status: MemberStatus.ACTIVE,
    gender: Gender.MALE,
    nationalId: '',
    monthlySubscription: 20,
    joinDate: new Date().toISOString().split('T')[0]
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered Members
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesSearch = m.fullName.includes(searchTerm) || m.memberCode.includes(searchTerm) || m.phone.includes(searchTerm);
      const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || m.membershipType === typeFilter;
      const matchesCity = cityFilter === 'ALL' || m.city === cityFilter;
      return matchesSearch && matchesStatus && matchesType && matchesCity;
    }).sort((a, b) => b.memberCode.localeCompare(a.memberCode));
  }, [members, searchTerm, statusFilter, typeFilter, cityFilter]);

  const handleOpenModal = (member?: Member) => {
    if (member) {
      setFormData(member);
      setEditingId(member.id);
    } else {
      setFormData({
        fullName: '',
        phone: '',
        whatsapp: '',
        city: 'نابلس',
        membershipType: MembershipType.MEMBER,
        status: MemberStatus.ACTIVE,
        gender: Gender.MALE,
        nationalId: '',
        monthlySubscription: 20,
        joinDate: new Date().toISOString().split('T')[0],
        memberCode: generateMemberCode()
      });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const generateMemberCode = () => {
    const lastCode = members.length > 0
      ? Math.max(...members.map(m => parseInt(m.memberCode.replace(/\D/g, '')) || 0))
      : (appSettings.memberIdStart || 1) - 1;
    return `M-${String(lastCode + 1).padStart(4, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateMember(editingId, formData);
      } else {
        await addMember(formData);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا العضو؟ لا يمكن التراجع عن هذه الخطوة.')) {
      try {
        await deleteMember(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getMemberTransactions = (memberId: string) => {
    return transactions.filter(t => t.memberId === memberId);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800">إدارة الأعضاء</h1>
          <p className="text-gray-500 text-sm mt-1">إضافة، تعديل، ومتابعة اشتراكات أعضاء الجمعية.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsSettingsModalOpen(true)} className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-gray-800 shadow-sm transition-all">
            <Settings size={20} />
          </button>
          <button onClick={() => setIsExportModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 font-bold text-sm hover:bg-gray-50 shadow-sm">
            <Table size={18} /> عرض البيانات
          </button>
          <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100 active:scale-95 transition-all">
            <Plus size={18} /> إضافة عضو جديد
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="البحث بالاسم، الرقم، أو الهاتف..."
            className="w-full pr-10 pl-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs outline-none">
          <option value="ALL">كل الحالات</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl font-bold text-xs outline-none">
          <option value="ALL">كل الفئات</option>
          {Object.entries(MEMBERSHIP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map(member => (
          <div key={member.id} className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all p-6 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-1.5 h-full ${member.status === MemberStatus.ACTIVE ? 'bg-emerald-500' : 'bg-red-400'}`}></div>

            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="font-black text-gray-800 group-hover:text-emerald-700 transition-colors">{member.fullName}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-500 font-black">{member.memberCode}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${member.status === MemberStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {STATUS_LABELS[member.status]}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleDelete(member.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                  <Trash2 size={16} />
                </button>
                <button onClick={() => handleOpenModal(member)} className="p-2 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all">
                  <Edit2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-bold">رقم الهاتف</span>
                <span className="font-black text-gray-700" dir="ltr">{member.phone}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-bold">المدينة</span>
                <span className="font-black text-gray-700">{member.city}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-bold">نوع العضوية</span>
                <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded-lg font-black">{MEMBERSHIP_LABELS[member.membershipType]}</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => { setViewMember(member); setDetailTab('INFO'); }}
                className="w-full py-3 bg-gray-50 hover:bg-emerald-50 text-gray-500 hover:text-emerald-700 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all border border-transparent hover:border-emerald-100"
              >
                <Eye size={18} /> عرض التفاصيل والاشتراكات
              </button>
            </div>
          </div>
        ))}
      </div>

      {isLoading && <div className="text-center py-20 text-gray-400 font-bold">جاري تحميل الأعضاء...</div>}
      {!isLoading && filteredMembers.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <User size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 font-bold text-lg">لا يوجد أعضاء يطابقون بحثك</p>
        </div>
      )}

      {/* Member Details Modal */}
      {viewMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-end md:justify-center p-0 md:p-6 translate-x-0 animate-slide-in-right">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setViewMember(null)} />
          <div className="relative w-full max-w-2xl h-screen md:h-auto md:max-h-[90vh] bg-white md:rounded-3xl shadow-2xl flex flex-col overflow-hidden">

            {/* Modal Header */}
            <div className="bg-gray-900 text-white p-6 shrink-0">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                    <User size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">{viewMember.fullName}</h2>
                    <p className="text-gray-400 text-xs font-bold font-mono tracking-widest">{viewMember.memberCode}</p>
                  </div>
                </div>
                <button onClick={() => setViewMember(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2">
                {[
                  { id: 'INFO', label: 'البيانات الأساسية', icon: Info },
                  { id: 'SUBS', label: 'سجل المستحقات', icon: Receipt },
                  { id: 'TRANS', label: 'الحركات المالية', icon: Wallet }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDetailTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all ${detailTab === tab.id ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                  >
                    <tab.icon size={16} /> {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
              {detailTab === 'INFO' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-1">تاريخ الانضمام</p>
                      <p className="font-bold text-gray-800">{viewMember.joinDate}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-1">رقم الهوية</p>
                      <p className="font-bold text-gray-800 font-mono tracking-tighter">{viewMember.nationalId || '---'}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-1">رقم الهاتف</p>
                      <p className="font-bold text-gray-800" dir="ltr">{viewMember.phone}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-1">المدينة والسكني</p>
                      <p className="font-bold text-gray-800">{viewMember.city} - {viewMember.address || '-'}</p>
                    </div>
                  </div>

                  {viewMember.additionalData && Object.keys(viewMember.additionalData).length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                        <span className="text-[10px] font-black text-gray-500 uppercase">بيانات إضافية</span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {Object.entries(viewMember.additionalData).map(([k, v]) => (
                          <div key={k} className="flex justify-between items-center px-4 py-3 text-sm">
                            <span className="text-gray-400 font-bold">{k}</span>
                            <span className="text-gray-700 font-bold">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {detailTab === 'SUBS' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-100 flex justify-between items-center">
                    <div>
                      <p className="text-blue-100 text-xs font-black mb-1">الاشتراك الشهري المعتمد</p>
                      <h4 className="text-2xl font-black">₪ {viewMember.monthlySubscription || 0}</h4>
                    </div>
                    <button className="bg-white/20 hover:bg-white/30 p-3 rounded-2xl transition-all">
                      <CreditCard size={24} />
                    </button>
                  </div>
                  <div className="text-center py-10 text-gray-400 font-bold bg-white rounded-2xl border-2 border-gray-100 border-dashed">
                    قائمة المستحقات والديون (قيد التطوير)
                  </div>
                </div>
              )}

              {detailTab === 'TRANS' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[9px] border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3">رقم السند</th>
                          <th className="px-4 py-3">التاريخ</th>
                          <th className="px-4 py-3">البيان</th>
                          <th className="px-4 py-3">المبلغ</th>
                          <th className="px-4 py-3 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 font-bold">
                        {getMemberTransactions(viewMember.id).map(t => (
                          <tr key={t.id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-3 text-gray-800">#{t.voucherNumber || '---'}</td>
                            <td className="px-4 py-3 text-gray-500">{new Date(t.date).toLocaleDateString('ar-EG')}</td>
                            <td className="px-4 py-3 text-gray-800">{t.description || t.category}</td>
                            <td className="px-4 py-3 text-emerald-600" dir="ltr">+ {t.amount} ₪</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setPrintingTransaction(t)}
                                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                title="طباعة سند"
                              >
                                <Printer size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {getMemberTransactions(viewMember.id).length === 0 && (
                          <tr><td colSpan={5} className="p-10 text-center text-gray-400">لا يوجد حركات مسجلة</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-between shrink-0">
              <button
                onClick={() => { setViewMember(null); handleOpenModal(viewMember); }}
                className="px-6 py-2 text-emerald-600 font-black text-sm hover:bg-emerald-50 rounded-xl transition-all"
              >
                تعديل البيانات
              </button>
              <button onClick={() => setViewMember(null)} className="px-8 py-2 bg-gray-900 text-white rounded-xl font-black text-sm active:scale-95 transition-all">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal (Placeholder for context Config) */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSettingsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl p-8 animate-slide-up">
            <h3 className="text-xl font-black mb-6">إعدادات ترقيم العضوية</h3>
            <p className="text-sm text-gray-500 font-bold mb-6 italic">هذه الإعدادات محفوظة في الذاكرة السحابية للنظام.</p>
            <button onClick={() => setIsSettingsModalOpen(false)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black">إغلاق</button>
          </div>
        </div>
      )}

      {/* Member Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-gray-100 shrink-0">
              <h3 className="text-xl font-black text-gray-800">{editingId ? 'تعديل بيانات العضو' : 'إضافة عضو جديد'}</h3>
            </div>

            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 mr-2">رقم العضوية (تلقائي)</label>
                  <input type="text" readOnly className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-black text-gray-400 outline-none" value={formData.memberCode} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-700 mr-2">الاسم الرباعي</label>
                  <input required type="text" className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-2xl font-black outline-none focus:border-emerald-500 transition-all" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-700 mr-2">رقم الهاتف</label>
                  <input required type="text" className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-2xl font-black outline-none focus:border-emerald-500 transition-all" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-emerald-600 mr-2">مبلغ الاشتراك المقترح (₪)</label>
                  <input type="number" className="w-full px-4 py-3 bg-emerald-50/30 border-2 border-emerald-100 rounded-2xl font-black outline-none focus:border-emerald-500 transition-all" value={formData.monthlySubscription} onChange={e => setFormData({ ...formData, monthlySubscription: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 bg-gray-100 text-gray-500 rounded-2xl font-black hover:bg-gray-200 transition-all">إلغاء</button>
                <button type="submit" disabled={isSubmitting} className="px-10 py-3 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 flex items-center gap-2">
                  <CheckCircle size={18} /> {editingId ? 'حفظ التعديلات' : 'إضافة العضو الآن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voucher Print Preview */}
      {printingTransaction && (
        <VoucherPrint
          transaction={printingTransaction}
          settings={appSettings}
          medium={financialMedia.find(m => m.id === printingTransaction.mediumId)}
          member={viewMember || undefined}
          onClose={() => setPrintingTransaction(null)}
        />
      )}
    </div>
  );
};

export default Members;