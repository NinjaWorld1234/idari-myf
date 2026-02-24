import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, User, MemberFieldDef, MembershipType } from '../types';
import { Save, Upload, Download, UserPlus, Trash2, Shield, Image, AlertCircle, CheckCircle, FileUp, Printer, Phone, MapPin, Mail, Globe, Hash, Wallet, DollarSign, Plus, ToggleLeft, ToggleRight, ListChecks, X, Tag, Minus } from 'lucide-react';
import PrintHeader from '../components/PrintHeader';

const Settings = () => {
  const {
    appSettings, updateSettings, members, transactions, importFullData,
    financialMedia, updateFinancialMedium, addFinancialMedium, deleteFinancialMedium,
    subscriptionTypes, addSubscriptionType, updateSubscriptionType, deleteSubscriptionType
  } = useApp();
  const { user, usersList, addUser, deleteUser, importUsers } = useAuth();

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

  // Member Fields Management State
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState<Partial<MemberFieldDef>>({ key: '', label: '', type: 'text', required: false, group: 'extra' });
  const memberFields = appSettings.memberFields || [];

  // Access Control: Allow both MANAGER and ACCOUNTANT as requested
  if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.ACCOUNTANT) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <div className="bg-red-50 p-6 rounded-full mb-4">
          <Shield className="text-red-600 w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">غير مصرح بالدخول</h2>
        <p className="text-gray-500 mt-2">هذه الصفحة خاصة بالإدارة والمحاسبة فقط.</p>
      </div>
    );
  }

  // --- Handlers ---

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      logoUrl,
      organizationName: orgName,
      ...headerInfo
    });
    showMessage('success', 'تم حفظ إعدادات الهوية والترويسة بنجاح');
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

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (usersList.some(u => u.email === newUser.email)) {
      showMessage('error', 'البريد الإلكتروني مستخدم بالفعل');
      return;
    }
    addUser({
      id: Math.random().toString(36).substr(2, 9),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    });
    setNewUser({ name: '', email: '', role: UserRole.OFFICER });
    showMessage('success', 'تم إضافة المستخدم بنجاح');
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

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.data) {
          if (window.confirm('تحذير: استعادة النسخة الاحتياطية سيقوم باستبدال كافة البيانات الحالية. هل أنت متأكد؟')) {
            importFullData({
              members: json.data.members || [],
              transactions: json.data.transactions || [],
              appSettings: json.data.appSettings || {}
            });
            if (json.data.users) {
              importUsers(json.data.users);
            }
            // Sync local inputs
            if (json.data.appSettings) {
              const s = json.data.appSettings;
              setLogoUrl(s.logoUrl || '');
              setOrgName(s.organizationName || '');
              setHeaderInfo({
                registrationNumber: s.registrationNumber || '',
                address: s.address || '',
                phone: s.phone || '',
                email: s.email || '',
                website: s.website || ''
              });
            }
            showMessage('success', 'تم استعادة البيانات بنجاح!');
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <header>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Shield className="text-emerald-600" /> الإعدادات العامة
        </h1>
        <p className="text-gray-500 text-sm mt-1">تحكم كامل في النظام: الهوية، المستخدمين، والبيانات.</p>
      </header>

      {message && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 font-bold z-50 ${message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      {/* 1. Branding & Header Section */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-6 border-b pb-2 flex items-center gap-2">
          <Image size={20} className="text-emerald-600" /> هوية التطبيق وترويسة الطباعة
        </h2>
        <form onSubmit={handleSaveBranding} className="space-y-6">

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم الجمعية / الملتقى</label>
              <input
                type="text"
                className="w-full px-4 py-2 border rounded-lg focus:ring-emerald-500"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رابط الشعار</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="رابط الصورة أو قم بالرفع..."
                  className="w-full px-4 py-2 border rounded-lg focus:ring-emerald-500 text-left dir-ltr"
                  value={logoUrl.length > 50 ? logoUrl.substring(0, 50) + '...' : logoUrl}
                  readOnly={logoUrl.startsWith('data:')}
                  onChange={(e) => setLogoUrl(e.target.value)}
                />
                <input
                  type="file"
                  accept="image/*"
                  ref={logoInputRef}
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 border border-gray-300 whitespace-nowrap"
                  title="رفع صورة من الجهاز"
                >
                  <FileUp size={20} />
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 border border-red-200"
                    title="حذف الشعار"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Print Header Details */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <Printer size={16} /> بيانات الترويسة (تظهر في الطباعة فقط)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Hash size={12} /> رقم الترخيص</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded text-sm"
                  value={headerInfo.registrationNumber}
                  onChange={(e) => setHeaderInfo({ ...headerInfo, registrationNumber: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Phone size={12} /> الهاتف</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded text-sm"
                  value={headerInfo.phone}
                  onChange={(e) => setHeaderInfo({ ...headerInfo, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><MapPin size={12} /> العنوان</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded text-sm"
                  value={headerInfo.address}
                  onChange={(e) => setHeaderInfo({ ...headerInfo, address: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Mail size={12} /> البريد الإلكتروني</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border rounded text-sm"
                  value={headerInfo.email}
                  onChange={(e) => setHeaderInfo({ ...headerInfo, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Globe size={12} /> الموقع الإلكتروني</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded text-sm"
                  value={headerInfo.website}
                  onChange={(e) => setHeaderInfo({ ...headerInfo, website: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="border-t pt-4">
            <span className="text-sm font-bold text-gray-500 mb-2 block">معاينة الترويسة (كما ستظهر في الطباعة):</span>
            <div className="border-2 border-dashed border-gray-300 p-8 bg-white rounded-lg">
              {/* Mocking the PrintHeader component appearance */}
              <div className="flex flex-col w-full font-sans">
                <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-2">
                  <div className="flex items-center gap-4">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo Preview" className="w-20 h-20 object-contain" />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">شعار</div>
                    )}
                    <div className="flex flex-col justify-center">
                      <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
                        {orgName || 'اسم الجمعية'}
                      </h1>
                      {headerInfo.registrationNumber && (
                        <p className="text-sm text-gray-600 font-medium mt-1">
                          رقم الترخيص: {headerInfo.registrationNumber}
                        </p>
                      )}
                      <h2 className="text-lg font-bold text-gray-800 mt-2 bg-gray-100 px-3 py-0.5 rounded w-fit border border-gray-300">
                        (نموذج معاينة)
                      </h2>
                    </div>
                  </div>
                  <div className="text-left flex flex-col items-end justify-center h-full opacity-50">
                    <div className="text-sm font-bold text-gray-500 mb-1">تاريخ التقرير</div>
                    <div className="text-lg font-bold text-gray-900">{new Date().toLocaleDateString('ar-EG')}</div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs font-medium text-gray-600 px-2">
                  {headerInfo.address && <span>{headerInfo.address}</span>}
                  {headerInfo.phone && <span>{headerInfo.phone}</span>}
                  {headerInfo.email && <span>{headerInfo.email}</span>}
                  {headerInfo.website && <span>{headerInfo.website}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2">
              <Save size={18} /> حفظ الإعدادات
            </button>
          </div>
        </form>
      </section>

      {/* 2. User Management */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
          <UserPlus size={20} className="text-blue-600" /> إدارة المستخدمين
        </h2>

        {/* Add User Form */}
        <form onSubmit={handleAddUser} className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="text-sm font-bold text-blue-800 mb-3">إضافة مستخدم جديد</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text" required placeholder="الاسم"
              className="px-3 py-2 rounded border border-blue-200"
              value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })}
            />
            <input
              type="email" required placeholder="البريد الإلكتروني"
              className="px-3 py-2 rounded border border-blue-200"
              value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })}
            />
            <select
              className="px-3 py-2 rounded border border-blue-200"
              value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}
            >
              {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
            </select>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium">إضافة</button>
          </div>
        </form>

        {/* Users List */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3">الاسم</th>
                <th className="px-4 py-3">البريد الإلكتروني</th>
                <th className="px-4 py-3">الصلاحية</th>
                <th className="px-4 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usersList.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3"><span className="bg-gray-100 px-2 py-1 rounded text-xs">{u.role}</span></td>
                  <td className="px-4 py-3">
                    {u.id !== user?.id && (
                      <button onClick={() => { if (window.confirm('حذف هذا المستخدم؟')) deleteUser(u.id); }} className="text-red-500 hover:bg-red-50 p-1.5 rounded">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Financial Media Management */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
          <Wallet size={20} className="text-emerald-600" /> إدارة الصناديق والوسائل المالية
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {financialMedia.map(m => (
            <div key={m.id} className="p-4 border rounded-xl bg-gray-50 flex justify-between items-center">
              <div>
                <p className="font-bold text-gray-800">{m.name}</p>
                <p className="text-xs text-gray-500">{m.type === 'CASH' ? 'نقدي / صندوق' : 'حساب بنكي'}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm font-black text-emerald-600">₪ {m.balance.toLocaleString()}</span>
                  <button
                    onClick={() => {
                      const newBalance = prompt(`تعديل رصيد ${m.name}:`, m.balance.toString());
                      if (newBalance !== null) updateFinancialMedium(m.id, { balance: parseFloat(newBalance) });
                    }}
                    className="text-[10px] bg-white border px-2 py-0.5 rounded shadow-sm hover:bg-gray-100"
                  >تعديل الرصيد</button>
                </div>
              </div>
              <button onClick={() => { if (window.confirm('حذف هذه الوسيلة؟')) deleteFinancialMedium(m.id); }} className="text-red-400 hover:text-red-600 p-2">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const name = prompt('اسم الوسيلة الجديدة:');
              if (name) addFinancialMedium({ name, type: 'CASH', balance: 0 });
            }}
            className="p-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-emerald-300 hover:text-emerald-500 hover:bg-emerald-50 transition-all flex flex-col items-center justify-center gap-1"
          >
            <Plus size={24} />
            <span className="text-xs font-bold">إضافة وسيلة مالية</span>
          </button>
        </div>
      </section>

      {/* 4. Subscription Types Management */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
          <DollarSign size={20} className="text-blue-600" /> إعدادات أنواع الاشتراكات
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subscriptionTypes.map(t => (
            <div key={t.id} className="p-4 border rounded-xl bg-gray-50 flex justify-between items-center">
              <div>
                <p className="font-bold text-gray-800">{t.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm font-black text-blue-600">₪ {t.amount}</span>
                  <button
                    onClick={() => {
                      const newAmount = prompt(`تعديل قيمة ${t.name}:`, t.amount.toString());
                      if (newAmount !== null) updateSubscriptionType(t.id, { amount: parseFloat(newAmount) });
                    }}
                    className="text-[10px] bg-white border px-2 py-0.5 rounded shadow-sm hover:bg-gray-100"
                  >تعديل القيمة</button>
                </div>
              </div>
              <button onClick={() => { if (window.confirm('حذف هذا المسمى؟')) deleteSubscriptionType(t.id); }} className="text-red-400 hover:text-red-600 p-2">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const name = prompt('اسم نوع الاشتراك الجديد:');
              const amount = prompt('القيمة الافتراضية:');
              if (name && amount) addSubscriptionType({ name, amount: parseFloat(amount) });
            }}
            className="p-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-1"
          >
            <Plus size={24} />
            <span className="text-xs font-bold">إضافة نوع اشتراك</span>
          </button>
        </div>
      </section>

      {/* 5. Voucher Prefix Management */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
          <Hash size={20} className="text-purple-600" /> تخصيص بادئات السندات
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(appSettings.voucherPrefixes || {}).map(([type, prefix]) => (
            <div key={type} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <label className="block text-[10px] text-gray-400 font-black mb-1 uppercase">{type}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="w-full bg-white border rounded px-2 py-1 text-sm font-black"
                  value={prefix}
                  onChange={(e) => {
                    const newPrefixes = { ...(appSettings.voucherPrefixes || {}), [type]: e.target.value.toUpperCase() };
                    updateSettings({ voucherPrefixes: newPrefixes });
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[10px] text-gray-400 font-bold italic">* ملاحظة: سيتم ترقيم السندات الجديدة تلقائياً بناءً على بادئتها الحالية والسنة الحالية.</p>
      </section>

      {/* 5. Backup & Restore */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
          <Download size={20} className="text-amber-600" /> النسخ الاحتياطي واستعادة البيانات
        </h2>
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-1">
            <h3 className="font-bold text-gray-800 mb-2">تصدير البيانات (Backup)</h3>
            <p className="text-sm text-gray-500 mb-4">قم بتنزيل ملف JSON يحتوي على كافة بيانات الأعضاء، الحركات المالية، الإعدادات، والمستخدمين.</p>
            <button onClick={handleExportBackup} className="bg-gray-800 text-white px-5 py-2.5 rounded-lg hover:bg-gray-900 flex items-center gap-2">
              <Download size={18} /> تحميل النسخة الكاملة
            </button>
          </div>

          <div className="w-px bg-gray-200 self-stretch hidden md:block"></div>

          <div className="flex-1">
            <h3 className="font-bold text-gray-800 mb-2">استعادة البيانات (Restore)</h3>
            <p className="text-sm text-gray-500 mb-4">رفع ملف JSON لاستعادة النظام. <span className="text-red-600 font-bold">تنبيه: سيتم حذف البيانات الحالية.</span></p>
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleImportBackup}
              className="hidden"
            />
            <button onClick={() => fileInputRef.current?.click()} className="bg-amber-600 text-white px-5 py-2.5 rounded-lg hover:bg-amber-700 flex items-center gap-2">
              <Upload size={18} /> رفع ملف استعادة
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════ Member Fields Management ═══════════════ */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ListChecks className="text-purple-600" size={22} />
              مواصفات الأعضاء
            </h2>
            <p className="text-gray-500 text-sm mt-1">تحكم في الحقول التي تظهر عند إضافة أو استيراد الأعضاء، وحدد الإجباري والاختياري.</p>
          </div>
          <button
            onClick={() => setShowAddField(!showAddField)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm font-bold"
          >
            <Plus size={16} /> إضافة حقل
          </button>
        </div>

        {/* Add Field Form */}
        {showAddField && (
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-6 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                placeholder="اسم الحقل (عربي)"
                value={newField.label || ''}
                onChange={e => setNewField({ ...newField, label: e.target.value, key: e.target.value.replace(/\s+/g, '_') })}
                className="p-3 border rounded-lg text-sm font-bold"
              />
              <select
                value={newField.type || 'text'}
                onChange={e => setNewField({ ...newField, type: e.target.value as any })}
                className="p-3 border rounded-lg text-sm font-bold"
              >
                <option value="text">نص</option>
                <option value="number">رقم</option>
                <option value="select">قائمة منسدلة</option>
                <option value="textarea">نص طويل</option>
                <option value="date">تاريخ</option>
              </select>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={newField.required || false}
                  onChange={e => setNewField({ ...newField, required: e.target.checked })}
                  className="w-4 h-4 accent-purple-600"
                />
                إجباري
              </label>
            </div>
            {newField.type === 'select' && (
              <input
                placeholder="الخيارات (افصلها بفاصلة، مثلاً: نعم, لا)"
                onChange={e => setNewField({ ...newField, options: e.target.value.split(',').map(s => s.trim()) })}
                className="w-full p-3 border rounded-lg text-sm font-bold"
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!newField.label?.trim()) { showMessage('error', 'يرجى إدخال اسم الحقل'); return; }
                  const updated = [...memberFields, { ...newField, key: newField.label!.replace(/\s+/g, '_'), group: 'extra' as const } as MemberFieldDef];
                  updateSettings({ memberFields: updated });
                  setNewField({ key: '', label: '', type: 'text', required: false, group: 'extra' });
                  setShowAddField(false);
                  showMessage('success', 'تم إضافة الحقل بنجاح');
                }}
                className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-bold"
              >حفظ</button>
              <button onClick={() => setShowAddField(false)} className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm font-bold">إلغاء</button>
            </div>
          </div>
        )}

        {/* Fields List */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {memberFields.map((field, index) => (
            <div key={field.key} className={`flex items-center justify-between p-3 rounded-xl border ${field.group === 'core' ? 'bg-blue-50/50 border-blue-100' : 'bg-gray-50 border-gray-100'
              }`}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className={`text-xs px-2 py-1 rounded-full font-bold ${field.group === 'core' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                  {field.group === 'core' ? 'أساسي' : 'إضافي'}
                </span>
                <span className="font-bold text-sm text-gray-800 truncate">{field.label}</span>
                <span className="text-xs text-gray-400">({field.type === 'text' ? 'نص' : field.type === 'select' ? 'قائمة' : field.type === 'number' ? 'رقم' : field.type === 'textarea' ? 'نص طويل' : 'تاريخ'})</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    const updated = memberFields.map((f, i) => i === index ? { ...f, required: !f.required } : f);
                    updateSettings({ memberFields: updated });
                  }}
                  className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-bold transition-colors ${field.required ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-500'
                    }`}
                  title={field.required ? 'إجباري - انقر للتغيير' : 'اختياري - انقر للتغيير'}
                >
                  {field.required ? <><ToggleRight size={16} /> إجباري</> : <><ToggleLeft size={16} /> اختياري</>}
                </button>
                {field.group === 'extra' && (
                  <button
                    onClick={() => {
                      const updated = memberFields.filter((_, i) => i !== index);
                      updateSettings({ memberFields: updated });
                      showMessage('success', 'تم حذف الحقل');
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════ Subscription Options ═══════════════ */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
          <DollarSign className="text-emerald-600" size={22} />
          خيارات الاشتراك الشهري
        </h2>
        <p className="text-gray-500 text-sm mb-4">حدد قيم الاشتراك المتاحة (بالشيكل). القيمة 0 = مجاني (أشرفيين أو معفيين).</p>
        <div className="flex flex-wrap gap-3">
          {(appSettings.subscriptionOptions || [0, 20, 30, 50]).map((val, i) => (
            <div key={i} className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
              <span className="font-black text-emerald-700">{val === 0 ? 'مجاني' : `₪ ${val}`}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">الأعضاء الشرفيون يتم تعيينهم تلقائياً كـ "مجاني" عند اختيار نوع العضوية "شرفي".</p>
      </section>

      {/* ═══════════════ Transaction Categories Management ═══════════════ */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6 border-b pb-2">
          <Tag className="text-emerald-600" size={22} />
          إدارة بنود الإيرادات والمصاريف
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Income Categories */}
          <div className="space-y-4">
            <h3 className="font-black text-emerald-700 flex items-center gap-2">
              <Plus size={18} /> بنود الإيرادات
            </h3>
            <div className="space-y-2">
              {(appSettings.incomeCategories || []).map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="font-bold text-sm text-emerald-900">{cat}</span>
                  <button
                    onClick={() => {
                      if (window.confirm(`حذف بند "${cat}"؟`)) {
                        const updated = (appSettings.incomeCategories || []).filter((_, i) => i !== idx);
                        updateSettings({ incomeCategories: updated });
                        showMessage('success', 'تم حذف البند');
                      }
                    }}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2 mt-4">
                <input
                  id="new-income-cat"
                  type="text"
                  placeholder="بند إيراد جديد..."
                  className="flex-1 px-4 py-2 border rounded-lg text-sm font-bold focus:ring-emerald-500 outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.currentTarget as HTMLInputElement).value.trim();
                      if (val) {
                        const updated = [...(appSettings.incomeCategories || []), val];
                        updateSettings({ incomeCategories: updated });
                        (e.currentTarget as HTMLInputElement).value = '';
                        showMessage('success', 'تم إضافة البند');
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('new-income-cat') as HTMLInputElement;
                    const val = input.value.trim();
                    if (val) {
                      const updated = [...(appSettings.incomeCategories || []), val];
                      updateSettings({ incomeCategories: updated });
                      input.value = '';
                      showMessage('success', 'تم إضافة البند');
                    }
                  }}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-bold text-sm"
                >إضافة</button>
              </div>
            </div>
          </div>

          {/* Expense Categories */}
          <div className="space-y-4">
            <h3 className="font-black text-red-700 flex items-center gap-2">
              <Minus size={18} /> بنود المصاريف
            </h3>
            <div className="space-y-2">
              {(appSettings.expenseCategories || []).map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                  <span className="font-bold text-sm text-red-900">{cat}</span>
                  <button
                    onClick={() => {
                      if (window.confirm(`حذف بند "${cat}"؟`)) {
                        const updated = (appSettings.expenseCategories || []).filter((_, i) => i !== idx);
                        updateSettings({ expenseCategories: updated });
                        showMessage('success', 'تم حذف البند');
                      }
                    }}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2 mt-4">
                <input
                  id="new-expense-cat"
                  type="text"
                  placeholder="بند مصروف جديد..."
                  className="flex-1 px-4 py-2 border rounded-lg text-sm font-bold focus:ring-red-500 outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.currentTarget as HTMLInputElement).value.trim();
                      if (val) {
                        const updated = [...(appSettings.expenseCategories || []), val];
                        updateSettings({ expenseCategories: updated });
                        (e.currentTarget as HTMLInputElement).value = '';
                        showMessage('success', 'تم إضافة البند');
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('new-expense-cat') as HTMLInputElement;
                    const val = input.value.trim();
                    if (val) {
                      const updated = [...(appSettings.expenseCategories || []), val];
                      updateSettings({ expenseCategories: updated });
                      input.value = '';
                      showMessage('success', 'تم إضافة البند');
                    }
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-bold text-sm"
                >إضافة</button>
              </div>
            </div>
          </div>
        </div>
      </section>


    </div>
  );
};

export default Settings;