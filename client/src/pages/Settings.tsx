import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, User, ROLE_LABELS, SubscriptionType, FinancialMedium } from '../types';
import { Save, Upload, Download, UserPlus, Trash2, Shield, Image, AlertCircle, CheckCircle, FileUp, Printer, Phone, MapPin, Mail, Globe, Hash, Wallet, CreditCard, ListChecks, Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
  const {
    appSettings, updateSettings, members, transactions, refreshData,
    subscriptionTypes, addSubscriptionType, updateSubscriptionType, deleteSubscriptionType,
    financialMedia, updateFinancialMedium
  } = useApp();
  const { user, usersList, fetchUsers, addUser, deleteUser } = useAuth();

  // Local State for Branding
  const [logoUrl, setLogoUrl] = useState(appSettings.logoUrl || '');
  const [orgName, setOrgName] = useState(appSettings.organizationName || 'ملتقى الشباب المسلم');

  // Local State for Print Header
  const [headerInfo, setHeaderInfo] = useState({
    registrationNumber: appSettings.registrationNumber || '',
    address: appSettings.address || '',
    phone: appSettings.phone || '',
    email: appSettings.email || '',
    website: appSettings.website || ''
  });

  const [newUser, setNewUser] = useState({ name: '', email: '', role: UserRole.OFFICER });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'ACCOUNTING' | 'USERS' | 'BACKUP'>('GENERAL');

  // Accounting State
  const [newSubType, setNewSubType] = useState({ name: '', amount: 0, period: 'MONTHLY' });

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Access Control
  if (user?.role !== UserRole.MANAGER) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <div className="bg-red-50 p-6 rounded-full mb-4">
          <Shield className="text-red-600 w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">غير مصرح بالدخول</h2>
        <p className="text-gray-500 mt-2">هذه الصفحة خاصة بالمدير العام فقط.</p>
      </div>
    );
  }

  // --- Handlers ---

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateSettings({
        logoUrl,
        organizationName: orgName,
        ...headerInfo
      });
      showMessage('success', 'تم حفظ إعدادات الهوية والترويسة بنجاح');
    } catch (e: any) {
      showMessage('error', e.message || 'Error saving settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit check
        showMessage('error', 'حجم الصورة كبير جداً (الحد الأقصى 2 ميجابايت)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usersList.some(u => u.email === newUser.email)) {
      showMessage('error', 'البريد الإلكتروني مستخدم بالفعل');
      return;
    }
    setIsSubmitting(true);
    try {
      await addUser(newUser);
      setNewUser({ name: '', email: '', role: UserRole.OFFICER });
      showMessage('success', 'تم إضافة المستخدم بنجاح');
    } catch (e: any) {
      showMessage('error', e.message || 'Error adding user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportBackup = () => {
    const fullData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        appSettings,
        members,
        transactions,
        users: usersList
      }
    };

    const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `MYF_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showMessage('success', 'تم تحميل ملف النسخة الاحتياطية');
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.data) {
          if (window.confirm('تحذير: استعادة النسخة الاحتياطية سيقوم باستبدال كافة البيانات الحالية. هل أنت متأكد؟')) {
            showMessage('error', 'استعادة النسخة الاحتياطية تتطلب الوصول لمدير النظام (Database Restoration)');
          }
        } else {
          showMessage('error', 'تنسيق الملف غير صحيح');
        }
      } catch (err) {
        showMessage('error', 'حدث خطأ أثناء قراءة الملف');
        console.error(err);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddSubType = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addSubscriptionType(newSubType as any);
      setNewSubType({ name: '', amount: 0, period: 'MONTHLY' });
      showMessage('success', 'تم إضافة نوع الاشتراك بنجاح');
    } catch (e: any) {
      showMessage('error', 'خطأ في الإضافة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubType = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف نوع الاشتراك؟')) return;
    try {
      await deleteSubscriptionType(id);
      showMessage('success', 'تم الحذف بنجاح');
    } catch (e: any) {
      showMessage('error', 'خطأ في الحذف');
    }
  };

  const menuItems = [
    { id: 'GENERAL', label: 'الإعدادات العامة', icon: Shield, color: 'text-emerald-600' },
    { id: 'ACCOUNTING', label: 'الإعدادات المحاسبية', icon: Wallet, color: 'text-blue-600' },
    { id: 'USERS', label: 'إدارة المستخدمين', icon: UserPlus, color: 'text-purple-600' },
    { id: 'BACKUP', label: 'البيانات والأرصدة', icon: Download, color: 'text-amber-600' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-3">
            <SettingsIcon className="text-emerald-600" size={28} /> مركز الإعدادات
          </h1>
          <p className="text-gray-500 text-sm mt-1 font-bold">تحكم كامل في هوية النظام، الحسابات، والمستخدمين.</p>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Navigation Sidebar */}
        <div className="md:w-64 shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 space-y-1 sticky top-4">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-black text-sm transition-all ${activeTab === item.id ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
              >
                <item.icon size={18} className={activeTab === item.id ? 'text-emerald-600' : 'text-gray-400'} />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-8">
          {message && (
            <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-black z-50 animate-bounce ${message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
              {message.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
              {message.text}
            </div>
          )}

          {activeTab === 'GENERAL' && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
              <div className="border-b border-gray-50 pb-4">
                <h2 className="text-xl font-black text-gray-800 flex items-center gap-3">
                  <Image size={24} className="text-emerald-600" /> الهوية البصرية والترويسة
                </h2>
                <p className="text-sm text-gray-400 mt-1 font-bold">إعدادات شعار الجمعية والبيانات المطبوعة على السندات.</p>
              </div>

              <form onSubmit={handleSaveBranding} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 mr-1">اسم الجمعية المحاسبي</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold transition-all outline-none"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="اسم الجمعية..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 mr-1">شعار الجمعية</label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold transition-all outline-none text-left dir-ltr text-xs"
                          value={logoUrl.length > 30 ? logoUrl.substring(0, 30) + '...' : logoUrl}
                          readOnly
                        />
                      </div>
                      <input type="file" accept="image/*" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" />
                      <button type="button" onClick={() => logoInputRef.current?.click()} className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 border border-emerald-100 transition-colors">
                        <FileUp size={20} />
                      </button>
                      {logoUrl && (
                        <button type="button" onClick={() => setLogoUrl('')} className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 border border-red-100 transition-colors">
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 space-y-6">
                  <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Printer size={16} /> تفاصيل الاتصال (للخطابات والسندات)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-1.5 font-bold">
                      <label className="text-xs text-gray-400 mr-1">رقم الترخيص</label>
                      <input type="text" className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-emerald-500 transition-all text-sm" value={headerInfo.registrationNumber} onChange={(e) => setHeaderInfo({ ...headerInfo, registrationNumber: e.target.value })} />
                    </div>
                    <div className="space-y-1.5 font-bold">
                      <label className="text-xs text-gray-400 mr-1">رقم الهاتف</label>
                      <input type="text" className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-emerald-500 transition-all text-sm" value={headerInfo.phone} onChange={(e) => setHeaderInfo({ ...headerInfo, phone: e.target.value })} />
                    </div>
                    <div className="space-y-1.5 font-bold">
                      <label className="text-xs text-gray-400 mr-1">العنوان</label>
                      <input type="text" className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-emerald-500 transition-all text-sm" value={headerInfo.address} onChange={(e) => setHeaderInfo({ ...headerInfo, address: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button type="submit" disabled={isSubmitting} className="bg-gray-900 text-white px-10 py-3 rounded-2xl hover:bg-black font-black flex items-center gap-3 shadow-lg active:scale-95 transition-all disabled:opacity-50">
                    <Save size={20} /> {isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                  </button>
                </div>
              </form>
            </section>
          )}

          {activeTab === 'ACCOUNTING' && (
            <div className="space-y-8">
              {/* Subscription Types */}
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="border-b border-gray-50 pb-4 mb-8">
                  <h2 className="text-xl font-black text-gray-800 flex items-center gap-3">
                    <ListChecks size={24} className="text-blue-600" /> أنواع الاشتراكات
                  </h2>
                  <p className="text-sm text-gray-400 mt-1 font-bold">تعريف فئات الاشتراك الشهرية أو السنوية المتاحة للأعضاء.</p>
                </div>

                <form onSubmit={handleAddSubType} className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 mb-8">
                  <h3 className="text-xs font-black text-blue-600 mb-4 uppercase tracking-widest">إضافة فئة اشتراك جديدة</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text" required placeholder="اسم الفئة (مثلاً: اشتراك شهري عام)"
                      className="px-4 py-3 bg-white rounded-2xl border border-blue-200 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      value={newSubType.name} onChange={e => setNewSubType({ ...newSubType, name: e.target.value })}
                    />
                    <div className="relative">
                      <input
                        type="number" required placeholder="المبلغ (₪)"
                        className="w-full px-4 py-3 bg-white rounded-2xl border border-blue-200 font-bold outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        value={newSubType.amount || ''} onChange={e => setNewSubType({ ...newSubType, amount: Number(e.target.value) })}
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-blue-300">₪</span>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-blue-700 shadow-md active:scale-95 transition-all">إضافة الفئة</button>
                  </div>
                </form>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {subscriptionTypes.map(type => (
                    <div key={type.id} className="p-5 bg-white border border-gray-100 rounded-3xl flex justify-between items-center group hover:border-blue-200 transition-all shadow-sm">
                      <div>
                        <h4 className="font-black text-gray-800">{type.name}</h4>
                        <div className="flex gap-3 items-center mt-1">
                          <span className="text-blue-600 font-black text-lg">₪ {type.amount}</span>
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">{type.period}</span>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteSubType(type.id)} className="p-3 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                  {subscriptionTypes.length === 0 && (
                    <div className="col-span-2 py-10 text-center text-gray-400 font-bold">لا يوجد أنواع اشتراكات معرفة حالياً</div>
                  )}
                </div>
              </section>

              {/* Financial Media */}
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="border-b border-gray-50 pb-4 mb-8">
                  <h2 className="text-xl font-black text-gray-800 flex items-center gap-3">
                    <Wallet size={24} className="text-emerald-600" /> الوسائل المالية والحسابات
                  </h2>
                  <p className="text-sm text-gray-400 mt-1 font-bold">إدارة النقدي والبنك والأرصدة الافتتاحية.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {financialMedia.map(medium => (
                    <div key={medium.id} className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="p-3 bg-white rounded-2xl shadow-sm">
                          {medium.type === 'CASH' ? <Wallet size={24} className="text-amber-500" /> : <CreditCard size={24} className="text-blue-500" />}
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">إجمالي الرصيد الحالي</p>
                          <p className="text-2xl font-black text-gray-900" dir="ltr">₪ {medium.balance.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1.5 font-bold">
                          <label className="text-xs text-gray-400 mr-1">اسم الحساب / العهدة</label>
                          <input
                            type="text"
                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-emerald-500 transition-all font-bold"
                            value={medium.name}
                            onChange={(e) => updateFinancialMedium(medium.id, { name: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'USERS' && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="border-b border-gray-50 pb-4 mb-8">
                <h2 className="text-xl font-black text-gray-800 flex items-center gap-3">
                  <UserPlus size={24} className="text-purple-600" /> إدارة فريق العمل
                </h2>
                <p className="text-sm text-gray-400 mt-1 font-bold">إضافة مشرفين أو محاسبين بصلاحيات محددة.</p>
              </div>

              <form onSubmit={handleAddUser} className="bg-purple-50/50 p-6 rounded-3xl border border-purple-100 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input
                    type="text" required placeholder="الاسم الكامل"
                    className="px-4 py-3 bg-white rounded-2xl border border-purple-200 font-bold outline-none focus:ring-2 focus:ring-purple-500"
                    value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  />
                  <input
                    type="email" required placeholder="البريد الإلكتروني"
                    className="px-4 py-3 bg-white rounded-2xl border border-purple-200 font-bold outline-none focus:ring-2 focus:ring-purple-500 text-left dir-ltr"
                    value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  />
                  <select
                    className="px-4 py-3 bg-white rounded-2xl border border-purple-200 font-black outline-none focus:ring-2 focus:ring-purple-500"
                    value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                  >
                    {Object.values(UserRole).map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                  </select>
                  <button type="submit" disabled={isSubmitting} className="bg-purple-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-purple-700 shadow-md active:scale-95 transition-all">إضافة</button>
                </div>
              </form>

              <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-right text-sm">
                  <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[10px] border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4">العضو</th>
                      <th className="px-6 py-4">الصلاحية</th>
                      <th className="px-6 py-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {usersList.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-black text-gray-800">{u.name}</div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${u.role === UserRole.MANAGER ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                            {ROLE_LABELS[u.role]}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {u.id !== user?.id && (
                            <button onClick={() => { if (window.confirm('حذف هذا المستخدم؟')) deleteUser(u.id); }} className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'BACKUP' && (
            <div className="space-y-8">
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="border-b border-gray-50 pb-4 mb-8">
                  <h2 className="text-xl font-black text-gray-800 flex items-center gap-3">
                    <Download size={24} className="text-amber-600" /> النسخ الاحتياطي والأمان
                  </h2>
                  <p className="text-sm text-gray-400 mt-1 font-bold">تصدير واستيراد قاعدة البيانات لضمان عدم ضياع المعلومات.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-amber-50/30 p-8 rounded-3xl border border-amber-100 space-y-4">
                    <h3 className="font-black text-gray-800 flex items-center gap-2">تصدير البيانات</h3>
                    <p className="text-xs text-gray-500 font-bold leading-relaxed">قم بتنزيل ملف مشفر يحتوي على كافة الأعضاء، السجل المالي، والمستندات المرفقة.</p>
                    <button onClick={handleExportBackup} className="w-full bg-gray-900 text-white px-6 py-4 rounded-2xl font-black hover:bg-black flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all">
                      <Download size={20} /> تحميل النسخة الاحتياطية
                    </button>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-gray-100 space-y-4">
                    <h3 className="font-black text-gray-800 flex items-center gap-2">استعادة النظام</h3>
                    <p className="text-xs text-gray-500 font-bold leading-relaxed text-red-400 italic">تحذير: هذه العملية ستمسح كافة البيانات الحالية وتستبدلها بالملف المرفوع.</p>
                    <input type="file" accept=".json" ref={fileInputRef} onChange={handleImportBackup} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full bg-white text-gray-900 px-6 py-4 rounded-2xl font-black border-2 border-gray-900 border-dashed hover:bg-gray-50 flex items-center justify-center gap-3 active:scale-95 transition-all">
                      <Upload size={20} /> رفع ملف استيراد
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;