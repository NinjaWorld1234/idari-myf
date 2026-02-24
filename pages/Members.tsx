import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Member, MembershipType, MemberStatus, UserRole, TransactionType, TransactionDirection, Gender } from '../types';
import { Search, Plus, Filter, Trash2, Edit2, CreditCard, CheckCircle, AlertCircle, User, MessageCircle, FileSpreadsheet, Info, Eye, X, GraduationCap, XCircle, DollarSign, Calendar, Settings, Table, Download, Printer, Copy, Phone, Trash, Wallet } from 'lucide-react';
import CollectSubscriptionModal from '../components/CollectSubscriptionModal';
import { PALESTINIAN_CITIES } from '../constants';
import * as XLSX from 'xlsx';

const Members = () => {
  const { members, addMember, deleteMember, clearMembers, updateMember, transactions, addTransaction, appSettings, updateSettings } = useApp();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // State for Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payMemberId, setPayMemberId] = useState<string | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [viewMember, setViewMember] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'subs' | 'txns'>('info');

  // State for Filtering
  const [searchTerm, setSearchTerm] = useState('');

  // Advanced Dynamic Filtering State
  const [activeFilters, setActiveFilters] = useState<{ key: string, value: string }[]>([]);
  const [selectedFilterKey, setSelectedFilterKey] = useState<string>('');
  const [selectedFilterValue, setSelectedFilterValue] = useState<string>('');

  // Settings State
  const [startIdConfig, setStartIdConfig] = useState(appSettings.memberIdStart);

  // Export Modal State
  const [selectedExportColumns, setSelectedExportColumns] = useState<string[]>([]);

  // Helpers UI State
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentYear = new Date().getFullYear();

  // Access Control: Allow Accountant for collection
  const isManager = user?.role === UserRole.MANAGER;
  const isOfficer = user?.role === UserRole.OFFICER;
  const isAccountant = user?.role === UserRole.ACCOUNTANT;
  const canEdit = isManager || isOfficer;
  const canCollect = isManager || isOfficer || isAccountant;

  // View permissions
  const showPersonalData = isManager || isOfficer || isAccountant;

  // Form State for Member
  const [formData, setFormData] = useState<Partial<Member>>({
    membershipType: MembershipType.MEMBER,
    status: MemberStatus.ACTIVE,
    gender: Gender.MALE,
    additionalData: {}
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>(PALESTINIAN_CITIES[0]);
  const [customCity, setCustomCity] = useState<string>('');
  const isOtherCity = selectedCity === 'أخرى';

  // ID Generation Logic (moved up for useEffect)
  const getNextMemberCode = () => {
    const maxExisting = members.reduce((max, m) => Math.max(max, parseInt(m.memberCode) || 0), 0);
    const nextId = Math.max(maxExisting + 1, appSettings.memberIdStart);
    return nextId.toString();
  };

  // Open modal from Quick Actions (Dashboard)
  useEffect(() => {
    if (location.state?.openAdd && canEdit) {
      setIsModalOpen(true);
      setEditingId(null);
      setFormData({
        memberCode: getNextMemberCode(),
        membershipType: MembershipType.MEMBER,
        status: MemberStatus.ACTIVE,
        gender: Gender.MALE,
        additionalData: {}
      });
      // Clear the state so it doesn't re-trigger on unmount/remount if not intended
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, canEdit, navigate, members.length, appSettings.memberIdStart]);

  // --- Performance-optimized helpers with useMemo ---
  const paidMemberIds = useMemo(() => {
    const ids = new Set<string>();
    transactions.forEach(t => {
      if (t.type === TransactionType.SUBSCRIPTION && t.status !== 'REVERSED' && t.memberId && new Date(t.date).getFullYear() === currentYear) {
        ids.add(t.memberId);
      }
    });
    return ids;
  }, [transactions, currentYear]);

  const isMemberPaid = (memberId: string) => paidMemberIds.has(memberId);

  const memberTransactionsMap = useMemo(() => {
    const map = new Map<string, typeof transactions>();
    transactions.forEach(t => {
      if (t.memberId) {
        const existing = map.get(t.memberId) || [];
        existing.push(t);
        map.set(t.memberId, existing);
      }
    });
    // Sort each member's transactions by date descending
    map.forEach((txns, key) => {
      map.set(key, txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });
    return map;
  }, [transactions]);

  const getMemberTransactions = (memberId: string) => memberTransactionsMap.get(memberId) || [];

  // --- Debt Tracking Logic (Starting from member joinDate) ---
  const debtStatsMap = useMemo(() => {
    const stats = new Map<string, { totalDebt: number; paidMonths: { m: number; y: number }[]; unpaidMonths: { m: number; y: number }[] }>();
    const now = new Date();
    const currentYearNum = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1;

    members.forEach(member => {
      const paidMonths: { m: number; y: number }[] = [];
      const memberTxns = getMemberTransactions(member.id);

      // Collect all months paid for - match m/y pattern in description or category
      memberTxns.forEach(t => {
        if (t.type === TransactionType.SUBSCRIPTION && t.status !== 'REVERSED') {
          const match = t.description?.match(/(\d+)\s*\/\s*(\d+)/);
          if (match) {
            paidMonths.push({ m: parseInt(match[1]), y: parseInt(match[2]) });
          } else {
            const catMatch = t.category?.match(/(\d+)\s*\/\s*(\d+)/);
            if (catMatch) {
              paidMonths.push({ m: parseInt(catMatch[1]), y: parseInt(catMatch[2]) });
            }
          }
        }
      });

      const unpaidMonths: { m: number; y: number }[] = [];
      const monthlyRate = member.monthlySubscription || 20;

      // If subscription is free (0), no debt
      if (monthlyRate === 0) {
        stats.set(member.id, { totalDebt: 0, paidMonths, unpaidMonths: [] });
        return;
      }

      // Start from member's joinDate
      const joinDate = new Date(member.joinDate);
      const startYear = joinDate.getFullYear();
      const startMonth = joinDate.getMonth() + 1;

      for (let y = startYear; y <= currentYearNum; y++) {
        const sM = (y === startYear) ? startMonth : 1;
        const eM = (y === currentYearNum) ? currentMonthNum : 12;

        for (let m = sM; m <= eM; m++) {
          const isPaid = paidMonths.some(p => p.m === m && p.y === y);
          if (!isPaid) {
            unpaidMonths.push({ m, y });
          }
        }
      }

      stats.set(member.id, {
        totalDebt: unpaidMonths.length * monthlyRate,
        paidMonths,
        unpaidMonths
      });
    });
    return stats;
  }, [members, transactions]);

  const getMemberDebtStats = (memberId: string) => debtStatsMap.get(memberId) || { totalDebt: 0, paidMonths: [], unpaidMonths: [] };

  // --- Copy & Contact Helpers ---
  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopyFeedback('تم النسخ!');
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const openWhatsApp = (number: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!number) return;
    const cleanNumber = number.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanNumber}`, '_blank');
  };

  // --- Dynamic Keys Extraction ---
  const allFilterKeys = useMemo(() => {
    const keys = new Set<string>();
    keys.add('المدينة');
    keys.add('نوع العضوية');
    keys.add('الحالة');
    keys.add('الجنس');
    keys.add('المهنة');
    members.forEach(m => {
      if (m.additionalData) {
        Object.keys(m.additionalData).forEach(k => keys.add(k));
      }
    });
    return Array.from(keys);
  }, [members]);

  const availableValuesForKey = useMemo(() => {
    if (!selectedFilterKey) return [];
    const values = new Set<string>();
    members.forEach(m => {
      let val: any = '';
      if (selectedFilterKey === 'المدينة') val = m.city;
      else if (selectedFilterKey === 'نوع العضوية') val = m.membershipType;
      else if (selectedFilterKey === 'الحالة') val = m.status;
      else if (selectedFilterKey === 'الجنس') val = m.gender;
      else if (selectedFilterKey === 'المهنة') val = m.job;
      else if (m.additionalData && m.additionalData[selectedFilterKey]) val = m.additionalData[selectedFilterKey];

      if (val) values.add(String(val).trim());
    });
    return Array.from(values).sort();
  }, [selectedFilterKey, members]);

  const addFilter = () => {
    if (selectedFilterKey && selectedFilterValue) {
      if (!activeFilters.some(f => f.key === selectedFilterKey && f.value === selectedFilterValue)) {
        setActiveFilters([...activeFilters, { key: selectedFilterKey, value: selectedFilterValue }]);
      }
      setSelectedFilterValue('');
    }
  };

  const removeFilter = (index: number) => {
    const newFilters = [...activeFilters];
    newFilters.splice(index, 1);
    setActiveFilters(newFilters);
  };

  // --- Filtering Logic ---
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const basicMatch =
        m.fullName.includes(searchTerm) ||
        m.memberCode.includes(searchTerm) ||
        m.phone.includes(searchTerm) ||
        (m.nationalId && m.nationalId.includes(searchTerm));

      const deepMatch = m.additionalData && Object.values(m.additionalData).some(val =>
        val && String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (!basicMatch && !deepMatch) return false;

      if (activeFilters.length > 0) {
        return activeFilters.every(filter => {
          let memberValue: any = '';
          if (filter.key === 'المدينة') memberValue = m.city;
          else if (filter.key === 'نوع العضوية') memberValue = m.membershipType;
          else if (filter.key === 'الحالة') memberValue = m.status;
          else if (filter.key === 'الجنس') memberValue = m.gender;
          else if (filter.key === 'المهنة') memberValue = m.job;
          else if (m.additionalData) memberValue = m.additionalData[filter.key];

          return String(memberValue).trim() === filter.value;
        });
      }
      return true;
    });
  }, [members, searchTerm, activeFilters]);

  // --- Export Columns Logic ---
  const allAvailableColumns = useMemo(() => {
    const cols = [
      'رقم العضوية', 'الاسم', 'رقم الهوية', 'الجنس', 'الهاتف',
      'واتساب', 'المدينة', 'العنوان', 'المهنة', 'نوع العضوية',
      'تاريخ الانضمام', 'الحالة'
    ];
    members.forEach(m => {
      if (m.additionalData) {
        Object.keys(m.additionalData).forEach(k => {
          if (!cols.includes(k) && !['الاسم الرباعي', 'رقم الهوية'].includes(k)) cols.push(k);
        });
      }
    });
    return cols;
  }, [members]);

  const handleOpenExportModal = () => {
    setSelectedExportColumns(allAvailableColumns);
    setIsExportModalOpen(true);
  };

  const toggleExportColumn = (col: string) => {
    if (selectedExportColumns.includes(col)) {
      setSelectedExportColumns(selectedExportColumns.filter(c => c !== col));
    } else {
      setSelectedExportColumns([...selectedExportColumns, col]);
    }
  };

  const exportSelectedData = () => {
    const headers = selectedExportColumns;
    let csvContent = "\uFEFF" + headers.join(',') + '\n';
    const dataToExport = filteredMembers.length > 0 ? filteredMembers : members;

    dataToExport.forEach(m => {
      const row = headers.map(header => {
        let val = '';
        if (header === 'رقم العضوية') val = m.memberCode;
        else if (header === 'الاسم') val = m.fullName;
        else if (header === 'رقم الهوية') val = m.nationalId || '';
        else if (header === 'الجنس') val = m.gender;
        else if (header === 'الهاتف') val = m.phone;
        else if (header === 'واتساب') val = m.whatsapp;
        else if (header === 'المدينة') val = m.city;
        else if (header === 'العنوان') val = m.address || '';
        else if (header === 'المهنة') val = m.job || '';
        else if (header === 'نوع العضوية') val = m.membershipType;
        else if (header === 'تاريخ الانضمام') val = m.joinDate;
        else if (header === 'الحالة') val = m.status;
        else if (m.additionalData && m.additionalData[header]) val = m.additionalData[header];
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `members_custom_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printSelectedData = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const dataToExport = filteredMembers.length > 0 ? filteredMembers : members;

    const html = `
      <html dir="rtl">
        <head>
          <title>تقرير الأعضاء الشامل</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background-color: #f2f2f2; }
            h1 { text-align: center; color: #047857; }
          </style>
        </head>
        <body>
          <h1>تقرير بيانات الأعضاء</h1>
          <table>
            <thead>
              <tr>${selectedExportColumns.map(col => `<th>${col}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${dataToExport.map(m => `
                <tr>
                  ${selectedExportColumns.map(header => {
      let val = '';
      if (header === 'رقم العضوية') val = m.memberCode;
      else if (header === 'الاسم') val = m.fullName;
      else if (header === 'رقم الهوية') val = m.nationalId || '';
      else if (header === 'الجنس') val = m.gender;
      else if (header === 'الهاتف') val = m.phone;
      else if (header === 'واتساب') val = m.whatsapp;
      else if (header === 'المدينة') val = m.city;
      else if (header === 'العنوان') val = m.address || '';
      else if (header === 'المهنة') val = m.job || '';
      else if (header === 'نوع العضوية') val = m.membershipType;
      else if (header === 'تاريخ الانضمام') val = m.joinDate;
      else if (header === 'الحالة') val = m.status;
      else if (m.additionalData && m.additionalData[header]) val = m.additionalData[header];
      return `<td>${val}</td>`;
    }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const handleOpenModal = (member?: Member, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canEdit) return;
    if (member) {
      setFormData(JSON.parse(JSON.stringify(member)));
      setEditingId(member.id);
      if (PALESTINIAN_CITIES.includes(member.city)) { setSelectedCity(member.city); setCustomCity(''); }
      else { setSelectedCity('أخرى'); setCustomCity(member.city); }
    } else {
      setFormData({
        memberCode: getNextMemberCode(),
        membershipType: MembershipType.MEMBER,
        status: MemberStatus.ACTIVE,
        joinDate: new Date().toISOString().split('T')[0],
        gender: Gender.MALE,
        additionalData: {}
      });
      setEditingId(null); setSelectedCity(PALESTINIAN_CITIES[0]); setCustomCity('');
    }
    setIsModalOpen(true);
  };

  const handleUpdateAdditionalData = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      additionalData: { ...prev.additionalData, [key]: value }
    }));
  };

  const handleDeleteAdditionalData = (key: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الحقل "${key}" لهذا العضو؟`)) return;
    const newData = { ...formData.additionalData };
    delete newData[key];
    setFormData(prev => ({ ...prev, additionalData: newData }));
  };

  const handleAddCustomField = () => {
    const key = prompt("أدخل اسم العنوان (الحقل) الجديد:");
    if (key) handleUpdateAdditionalData(key, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCity = isOtherCity ? customCity.trim() : selectedCity;
    if (!finalCity) { alert("يرجى تحديد المدينة"); return; }
    const memberData = { ...formData, city: finalCity } as Member;

    try {
      if (editingId && formData.id) await updateMember(editingId, memberData);
      else await addMember(memberData);
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء الحفظ');
    }
  };

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({ memberIdStart: startIdConfig });
    setIsSettingsModalOpen(false);
    alert('تم تحديث إعدادات تسلسل العضوية بنجاح');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('هل أنت متأكد من حذف هذا العضو؟')) deleteMember(id);
  };

  const processImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        if (data.length === 0) { alert('الملف فارغ'); return; }

        // Build a mapping: Excel column label -> memberField key
        const extraFields = (appSettings.memberFields || []).filter(f => f.group === 'extra');
        const labelToKeyMap: Record<string, string> = {};
        extraFields.forEach(f => { labelToKeyMap[f.label] = f.key; });

        let addedCount = 0;
        let errorCount = 0;
        let currentMaxCode = members.reduce((max, m) => Math.max(max, parseInt(m.memberCode) || 0), 0);
        let nextSequence = Math.max(currentMaxCode + 1, appSettings.memberIdStart);

        for (const row of data as any[]) {
          if (!row['الاسم الرباعي']) continue;
          const phone = row['رقم الواتساب مع المقدمة']?.toString() || row['رقم الهاتف']?.toString() || row['رقم هاتف الطوارئ']?.toString() || 'غير متوفر';

          // Parse subscription amount
          const parseSub = (): number => {
            let rawSub = row['الاشتراك الشهري'];
            if (!rawSub) {
              const key = Object.keys(row).find(k => k.trim() === 'الاشتراك الشهري');
              if (key) rawSub = row[key];
            }
            if (rawSub !== undefined && rawSub !== null) {
              if (typeof rawSub === 'number') return rawSub;
              let str = rawSub.toString().replace(/[٠-٩]/g, (d: string) => String(d.charCodeAt(0) - 1632));
              const match = str.match(/(\d+(\.\d+)?)/);
              return match ? parseFloat(match[0]) : 20;
            }
            return 20;
          };

          // Build additionalData by mapping Excel columns to field keys
          const additionalData: Record<string, any> = {};
          Object.keys(row).forEach(colName => {
            const trimmed = colName.trim();
            const skipLabels = ['الاسم الرباعي', 'رقم الهوية', 'الجنس', 'المحافظة', 'مكان الإقامة', 'طبيعة العمل', 'رقم الواتساب مع المقدمة', 'البريد الإلكتروني', 'الاشتراك الشهري', 'Timestamp'];
            if (skipLabels.includes(trimmed)) return;
            const fieldKey = labelToKeyMap[trimmed] || trimmed;
            additionalData[fieldKey] = row[colName];
          });

          const newMember: Partial<Member> = {
            memberCode: nextSequence.toString(),
            fullName: row['الاسم الرباعي'],
            nationalId: row['رقم الهوية']?.toString(),
            gender: row['الجنس']?.includes('أنثى') ? Gender.FEMALE : Gender.MALE,
            phone: phone,
            whatsapp: row['رقم الواتساب مع المقدمة']?.toString() || '',
            email: row['البريد الإلكتروني'],
            city: row['المحافظة'] || 'غير محدد',
            address: row['مكان الإقامة'],
            job: row['طبيعة العمل'],
            membershipType: MembershipType.MEMBER,
            status: MemberStatus.ACTIVE,
            joinDate: new Date().toISOString().split('T')[0],
            monthlySubscription: parseSub(),
            additionalData
          };

          try {
            await addMember(newMember);
            nextSequence++;
            addedCount++;
          } catch (err) {
            console.error('Failed to import member:', row['الاسم الرباعي'], err);
            errorCount++;
          }
        }
        const msg = errorCount > 0
          ? `تم استيراد ${addedCount} عضو بنجاح. فشل ${errorCount} عضو.`
          : `تم استيراد ${addedCount} عضو بنجاح!`;
        alert(msg);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error) {
        console.error(error);
        alert('حدث خطأ أثناء قراءة الملف.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const clearAllMembers = async () => {
    try {
      await clearMembers();
    } catch {
      // Error is handled and alerted in AppContext
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Toast Notification */}
      {copyFeedback && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-[100] text-sm font-bold flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-400" /> {copyFeedback}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إدارة الأعضاء</h1>
          <p className="text-gray-500 text-sm mt-1">قائمة أعضاء الجمعية وحالات اشتراكهم</p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {isManager && (
              <button onClick={clearAllMembers} className="flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-4 py-2.5 rounded-lg shadow-sm font-medium text-sm transition-colors">
                <Trash2 size={18} /> مسح الكل
              </button>
            )}
            <button onClick={() => handleOpenExportModal()} className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-sm font-medium text-sm">
              <Table size={18} /> الجدول الشامل / تصدير
            </button>
            {isManager && (
              <button onClick={() => setIsSettingsModalOpen(true)} className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-lg shadow-sm font-medium text-sm">
                <Settings size={18} /> إعدادات
              </button>
            )}
            <input type="file" ref={fileInputRef} onChange={processImport} className="hidden" accept=".xlsx, .xls, .csv" />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-lg shadow-sm font-medium text-sm">
              <FileSpreadsheet size={18} className="text-green-600" /> استيراد (Excel/CSV)
            </button>
            <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg shadow-sm font-medium text-sm">
              <Plus size={18} /> إضافة عضو
            </button>
          </div>
        )}
      </div>

      {/* --- Advanced Filtering Section --- */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
          <div className="relative flex-grow w-full md:w-auto">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="بحث شامل..."
              className="w-full pr-10 pl-4 py-3 border border-gray-100 rounded-2xl bg-gray-50 focus:bg-white outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 w-full md:w-auto">
            <select
              className="w-full px-4 py-3 border border-gray-100 rounded-2xl bg-gray-50 focus:bg-white outline-none transition-all text-sm"
              value={selectedFilterKey}
              onChange={(e) => { setSelectedFilterKey(e.target.value); setSelectedFilterValue(''); }}
            >
              <option value="">فلترة حسب العمود...</option>
              {allFilterKeys.map(key => <option key={key} value={key}>{key}</option>)}
            </select>
          </div>

          <div className="flex-1 w-full md:w-auto">
            <select
              className="w-full px-4 py-3 border border-gray-100 rounded-2xl bg-gray-50 focus:bg-white outline-none transition-all text-sm"
              value={selectedFilterValue}
              onChange={(e) => setSelectedFilterValue(e.target.value)}
              disabled={!selectedFilterKey}
            >
              <option value="">القيمة...</option>
              {availableValuesForKey.map(val => <option key={val} value={val}>{val}</option>)}
            </select>
          </div>

          <button
            onClick={addFilter}
            disabled={!selectedFilterKey || !selectedFilterValue}
            className="px-8 py-3 bg-gray-800 text-white rounded-2xl hover:bg-gray-900 disabled:bg-gray-200 transition-all font-bold text-sm w-full md:w-auto"
          >
            تطبيق
          </button>
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
            {activeFilters.map((filter, index) => (
              <div key={index} className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-800 px-3 py-1.5 rounded-xl text-[10px] font-bold">
                <span>{filter.key}:</span>
                <span>{filter.value}</span>
                <button onClick={() => removeFilter(index)} className="hover:text-red-600 mr-1"><X size={12} /></button>
              </div>
            ))}
            <button onClick={() => setActiveFilters([])} className="text-[10px] font-bold text-red-600 hover:underline px-2">مسح الكل</button>
          </div>
        )}
      </div>

      {/* Results Counter Bar */}
      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 px-4 py-3 rounded-2xl">
        <div className="flex items-center gap-2 text-emerald-800">
          <span className="font-black text-lg">{filteredMembers.length}</span>
          <span className="text-xs font-bold">عضو مطابق</span>
        </div>
        {filteredMembers.length !== members.length && (
          <span className="text-[10px] text-emerald-600 font-bold bg-white px-2 py-1 rounded-full">من أصل {members.length}</span>
        )}
      </div>

      {/* Member Cards - Mobile View */}
      <div className="grid grid-cols-1 md:hidden gap-4">
        {filteredMembers.map(member => {
          const stats = getMemberDebtStats(member.id);
          return (
            <div
              key={member.id}
              onClick={() => setViewMember(member)}
              className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4 active:scale-[0.98] transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-emerald-600 font-black text-xl">
                    {member.fullName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-black text-gray-800 text-sm">{member.fullName}</h4>
                    <p className="text-[10px] text-gray-400 font-bold">#{member.memberCode} • {member.membershipType}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${member.status === MemberStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {member.status}
                </span>
              </div>

              <div className="flex justify-between items-end pt-2 border-t border-gray-50">
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">حالة الاشتراك</p>
                  {stats.totalDebt > 0 ? (
                    <div className="flex items-center gap-1 text-red-600 font-black text-xs">
                      <AlertCircle size={14} /> متأخر {stats.totalDebt} ₪
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-emerald-600 font-black text-xs">
                      <CheckCircle size={14} /> ملتزم
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {canCollect && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPayMemberId(member.id); }}
                      className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100 active:scale-90 transition-all"
                    >
                      <CreditCard size={18} />
                    </button>
                  )}
                  <button className="p-3 bg-gray-100 text-gray-400 rounded-2xl active:scale-90 transition-all">
                    <Eye size={18} />
                  </button>
                  {canEdit && (
                    <button
                      onClick={(e) => handleDelete(member.id, e)}
                      className="p-3 bg-red-50 text-red-500 rounded-2xl active:scale-90 transition-all border border-red-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table - Desktop only */}
      <div className="bg-white rounded-[32px] shadow-sm border border-gray-50 overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-gray-50/50 text-gray-400 font-black text-[10px] uppercase tracking-widest border-b border-gray-50">
              <tr>
                <th className="px-6 py-5">الرقم</th>
                <th className="px-6 py-5">الاسم</th>
                <th className="px-6 py-5">التواصل</th>
                <th className="px-6 py-5">العنوان</th>
                <th className="px-6 py-5">الالتزام</th>
                <th className="px-6 py-5">المستحقات</th>
                <th className="px-6 py-5">الحالة</th>
                <th className="px-6 py-5">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {filteredMembers.map((member) => {
                const stats = getMemberDebtStats(member.id);
                return (
                  <tr
                    key={member.id}
                    onClick={() => setViewMember(member)}
                    className="hover:bg-gray-50/50 transition-all group cursor-pointer"
                  >
                    <td className="px-6 py-5 font-black text-gray-400 text-xs">#{member.memberCode}</td>
                    <td className="px-6 py-5">
                      <div className="font-black text-gray-800 flex items-center gap-2">
                        {member.fullName}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${member.gender === Gender.MALE ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                          {member.gender}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold mt-1">{member.membershipType}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                          <Phone size={12} className="text-gray-300" /> {member.phone}
                        </div>
                        {member.whatsapp && (
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                            <MessageCircle size={12} className="text-emerald-400" /> {member.whatsapp}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-gray-500 font-bold text-xs">{member.city}</td>
                    <td className="px-6 py-5 font-black text-emerald-600 text-xs">{member.monthlySubscription || 20} ₪</td>
                    <td className="px-6 py-5">
                      {stats.totalDebt > 0 ? (
                        <span className="text-red-600 font-black text-xs bg-red-50 px-3 py-1 rounded-full border border-red-100">
                          {stats.totalDebt} ₪
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-black text-[10px] bg-emerald-50 px-3 py-1 rounded-full">ملتزم</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black ${member.status === MemberStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setViewMember(member); }} className="p-2 bg-gray-100 text-gray-400 rounded-xl hover:bg-gray-800 hover:text-white transition-all">
                          <Eye size={16} />
                        </button>
                        {canCollect && (
                          <button onClick={(e) => { e.stopPropagation(); setPayMemberId(member.id); }} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100">
                            <CreditCard size={16} />
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={(e) => handleOpenModal(member, e)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all border border-blue-100">
                            <Edit2 size={16} />
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={(e) => handleDelete(member.id, e)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all border border-red-100" title="حذف العضو">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Full Profile View Modal with Tabs --- */}
      {viewMember && (
        <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setViewMember(null)} />
          <div className="relative w-full max-w-2xl bg-white rounded-t-[32px] md:rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom">
            <div className="p-6 pb-0 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 font-black text-2xl">
                  {viewMember.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-xl text-gray-800">{viewMember.fullName}</h3>
                  <p className="text-xs text-gray-400 font-bold">#{viewMember.memberCode} • {viewMember.membershipType}</p>
                </div>
              </div>
              <button onClick={() => setViewMember(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={24} className="text-gray-400" />
              </button>
            </div>

            <div className="flex border-b border-gray-50 px-6 mt-4">
              {[
                { id: 'info', label: 'البيانات', icon: User },
                { id: 'subs', label: 'الاشتراكات', icon: Calendar },
                { id: 'txns', label: 'العمليات', icon: DollarSign }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex items-center gap-2 px-4 py-4 text-xs font-black transition-all relative ${activeTab === t.id ? 'text-emerald-600' : 'text-gray-400'}`}
                >
                  <t.icon size={16} />
                  {t.label}
                  {activeTab === t.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-t-full" />}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
              {activeTab === 'info' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <DetailRow label="الهوية" value={viewMember.nationalId || '---'} />
                    <DetailRow label="الهاتف" value={viewMember.phone} />
                    <DetailRow label="المدينة" value={viewMember.city} />
                    <DetailRow label="تاريخ الانضمام" value={viewMember.joinDate} />
                  </div>
                  {viewMember.additionalData && Object.keys(viewMember.additionalData).length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">بيانات الملف</p>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(viewMember.additionalData).map(([key, value]) => {
                          if (['الاسم الرباعي', 'رقم الهوية'].includes(key)) return null;
                          return <DetailRow key={key} label={key} value={String(value)} />;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'subs' && (
                <div className="space-y-6">
                  {(() => {
                    const stats = getMemberDebtStats(viewMember.id);
                    return (
                      <>
                        <div className="flex justify-between items-center p-5 bg-emerald-600 rounded-3xl text-white shadow-lg shadow-emerald-100">
                          <div>
                            <p className="text-xs font-bold opacity-80 mb-1">الالتزام الشهري</p>
                            <p className="text-2xl font-black">{viewMember.monthlySubscription || 20} ₪</p>
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-bold opacity-80 mb-1">الديون المستحقة</p>
                            <p className="text-2xl font-black">{stats.totalDebt} ₪</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-[10px] text-gray-400 font-bold uppercase">شهور غير مسددة (2026+)</p>
                          <div className="flex flex-wrap gap-2">
                            {stats.unpaidMonths.map((m, i) => (
                              <span key={i} className="px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-black border border-red-100">
                                {m.m} / {m.y}
                              </span>
                            ))}
                            {stats.unpaidMonths.length === 0 && <p className="text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl">لا يوجد متأخرات، العضو ملتزم بالكامل</p>}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {activeTab === 'txns' && (
                <div className="space-y-4">
                  {getMemberTransactions(viewMember.id).length > 0 ? (
                    getMemberTransactions(viewMember.id).map(t => (
                      <div key={t.id} className="bg-white p-4 rounded-2xl border border-gray-50 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-black text-gray-800">{t.category}</p>
                          <p className="text-[10px] text-gray-400 font-bold">{t.date}</p>
                        </div>
                        <p className="font-black text-emerald-600" dir="ltr">+ {t.amount} ₪</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <DollarSign className="mx-auto text-gray-200 mb-2" size={32} />
                      <p className="text-gray-400 text-xs font-bold">لا توجد عمليات مسجلة</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 bg-white border-t border-gray-50 grid grid-cols-2 gap-3">
              <button
                onClick={() => { setPayMemberId(viewMember.id); setViewMember(null); }}
                className="flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-2xl font-black active:scale-95 transition-all shadow-lg shadow-emerald-100"
              >
                <DollarSign size={18} /> تحصيل اشتراك
              </button>
              {canEdit && (
                <button
                  onClick={() => { handleOpenModal(viewMember); setViewMember(null); }}
                  className="flex items-center justify-center gap-2 py-4 bg-gray-100 text-gray-700 rounded-2xl font-black active:scale-95 transition-all"
                >
                  <Edit2 size={18} /> تعديل البيانات
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- Settings Modal --- */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[170] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-50">
              <h3 className="text-lg font-black text-gray-800">إعدادات تسلسل العضوية</h3>
            </div>
            <form onSubmit={handleSettingsSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">بداية التسلسل</label>
                <input
                  type="number"
                  min="1"
                  required
                  className="w-full px-4 py-3 border border-gray-100 rounded-2xl bg-gray-50 focus:bg-white outline-none font-bold"
                  value={startIdConfig}
                  onChange={(e) => setStartIdConfig(parseInt(e.target.value))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsSettingsModalOpen(false)} className="px-6 py-3 text-gray-400 font-bold">إلغاء</button>
                <button type="submit" className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Full Table / Export Modal --- */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-[180] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gray-900 text-white p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black flex items-center gap-3"><Table size={24} /> الجدول الشامل والتصدير</h2>
                <p className="text-gray-400 text-[10px] font-bold mt-1 uppercase tracking-widest">تحكم في البيانات الظاهرة والمصدرة</p>
              </div>
              <button onClick={() => setIsExportModalOpen(false)} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all"><X size={20} /></button>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 bg-gray-50 border-b border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {allAvailableColumns.map(col => (
                    <label key={col} className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer text-[10px] font-black transition-all ${selectedExportColumns.includes(col) ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-white border-gray-200 text-gray-400 hover:border-emerald-600'}`}>
                      <input
                        type="checkbox"
                        checked={selectedExportColumns.includes(col)}
                        onChange={() => toggleExportColumn(col)}
                        className="hidden"
                      />
                      {col}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 bg-white">
                <table className="w-full text-right border-collapse text-xs">
                  <thead className="bg-gray-50 sticky top-0 shadow-sm z-10">
                    <tr>
                      {selectedExportColumns.map(col => (
                        <th key={col} className="px-4 py-4 border-b border-gray-100 font-black text-gray-400 uppercase text-[10px]">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredMembers.map(member => (
                      <tr key={member.id} className="hover:bg-gray-50/50">
                        {selectedExportColumns.map(col => {
                          let val: any = '';
                          if (col === 'رقم العضوية') val = member.memberCode;
                          else if (col === 'الاسم') val = member.fullName;
                          else if (col === 'رقم الهوية') val = member.nationalId || '';
                          else if (col === 'الجنس') val = member.gender;
                          else if (col === 'الهاتف') val = member.phone;
                          else if (col === 'واتساب') val = member.whatsapp;
                          else if (col === 'المدينة') val = member.city;
                          else if (col === 'العنوان') val = member.address || '';
                          else if (col === 'المهنة') val = member.job || '';
                          else if (col === 'نوع العضوية') val = member.membershipType;
                          else if (col === 'تاريخ الانضمام') val = member.joinDate;
                          else if (col === 'الحالة') val = member.status;
                          else if (member.additionalData && member.additionalData[col]) val = member.additionalData[col];

                          return <td key={col} className="px-4 py-3 text-gray-600 font-bold whitespace-nowrap">{String(val)}</td>
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={printSelectedData} className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 transition-all active:scale-95">
                <Printer size={18} /> طباعة
              </button>
              <button onClick={exportSelectedData} className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 transition-all active:scale-95">
                <Download size={18} /> تصدير CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="font-black text-xl text-gray-800">{editingId ? 'تعديل البيانات' : 'إضافة عضو جديد'}</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">تعبئة بيانات العضوية الرسمية</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all">
                <X size={24} className="text-gray-400" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto">
              <form id="memberForm" onSubmit={handleSubmit} className="space-y-8">
                {/* Membership Code (always shown) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">رقم العضوية</label>
                    <input readOnly type="text" className="w-full px-4 py-3 border border-gray-50 rounded-2xl bg-gray-50 font-black text-emerald-600" value={formData.memberCode} />
                  </div>
                </div>

                {/* Core Fields Section */}
                <div>
                  <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3 border-b border-blue-100 pb-2">البيانات الأساسية</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(appSettings.memberFields || []).filter(f => f.group === 'core').map(field => {
                      // Skip memberCode as it is handled separately
                      if (field.key === 'memberCode') return null;

                      // Handle special core fields
                      const coreKeys = ['fullName', 'nationalId', 'gender', 'phone', 'whatsapp', 'email', 'city', 'address', 'job', 'membershipType', 'monthlySubscription'];
                      if (!coreKeys.includes(field.key)) return null;

                      // City: special select + custom input
                      if (field.key === 'city') return (
                        <div key={field.key} className="md:col-span-2 space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                          <select className="w-full px-4 py-3 border border-gray-100 rounded-2xl bg-gray-50 focus:bg-white outline-none font-bold" value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
                            {PALESTINIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="أخرى">أخرى</option>
                          </select>
                          {isOtherCity && <input type="text" placeholder="اسم المدينة..." className="w-full mt-2 px-4 py-3 border border-gray-100 rounded-2xl bg-gray-50 focus:bg-white outline-none font-bold" value={customCity} onChange={e => setCustomCity(e.target.value)} />}
                        </div>
                      );

                      // MembershipType: select with auto-free subscription logic
                      if (field.key === 'membershipType') return (
                        <div key={field.key} className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{field.label} <span className="text-red-500">*</span></label>
                          <select required className="w-full px-4 py-3 border border-gray-100 rounded-2xl bg-gray-50 focus:bg-white outline-none font-bold" value={formData.membershipType} onChange={e => {
                            const val = e.target.value as MembershipType;
                            const isFree = (appSettings.freeSubscriptionTypes || []).includes(val);
                            setFormData({ ...formData, membershipType: val, ...(isFree ? { monthlySubscription: 0 } : {}) });
                          }}>
                            {Object.values(MembershipType).map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                      );

                      // MonthlySubscription: select from options
                      if (field.key === 'monthlySubscription') {
                        const isFreeType = (appSettings.freeSubscriptionTypes || []).includes(formData.membershipType as MembershipType);
                        return (
                          <div key={field.key} className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{field.label} <span className="text-red-500">*</span></label>
                            {isFreeType ? (
                              <div className="w-full px-4 py-3 border border-green-200 rounded-2xl bg-green-50 font-black text-green-700 text-sm">مجاني (عضوية شرفية)</div>
                            ) : (
                              <select required className="w-full px-4 py-3 border border-gray-100 rounded-2xl bg-gray-50 focus:bg-white outline-none font-bold" value={formData.monthlySubscription ?? 20} onChange={e => setFormData({ ...formData, monthlySubscription: parseInt(e.target.value) })}>
                                {(appSettings.subscriptionOptions || [0, 20, 30, 50]).map(v => (
                                  <option key={v} value={v}>{v === 0 ? 'مجاني' : `${v} ₪`}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        );
                      }

                      // Gender: select
                      if (field.key === 'gender') return (
                        <div key={field.key} className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                          <select required={field.required} className="w-full px-4 py-3 border border-gray-100 rounded-2xl bg-gray-50 focus:bg-white outline-none font-bold" value={formData.gender || Gender.MALE} onChange={e => setFormData({ ...formData, gender: e.target.value as Gender })}>
                            {Object.values(Gender).map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                      );

                      // Status: handled separately below
                      if (field.key === 'status') return null;

                      // All other core text fields
                      const coreValueMap: Record<string, any> = {
                        fullName: formData.fullName,
                        nationalId: formData.nationalId || '',
                        phone: formData.phone || '',
                        whatsapp: formData.whatsapp || '',
                        email: formData.email || '',
                        address: formData.address || '',
                        job: formData.job || '',
                      };
                      const coreSetMap: Record<string, (v: string) => void> = {
                        fullName: v => setFormData({ ...formData, fullName: v }),
                        nationalId: v => setFormData({ ...formData, nationalId: v }),
                        phone: v => setFormData({ ...formData, phone: v }),
                        whatsapp: v => setFormData({ ...formData, whatsapp: v }),
                        email: v => setFormData({ ...formData, email: v }),
                        address: v => setFormData({ ...formData, address: v }),
                        job: v => setFormData({ ...formData, job: v }),
                      };
                      return (
                        <div key={field.key} className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                          <input required={field.required} type="text" className="w-full px-4 py-3 border border-gray-100 rounded-2xl bg-gray-50 focus:bg-white outline-none font-bold" value={coreValueMap[field.key] ?? ''} onChange={e => coreSetMap[field.key]?.(e.target.value)} />
                        </div>
                      );
                    })}
                    {/* Status (always shown) */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">الحالة <span className="text-red-500">*</span></label>
                      <select required className="w-full px-4 py-3 border border-gray-100 rounded-2xl bg-gray-50 focus:bg-white outline-none font-bold" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as MemberStatus })}>
                        {Object.values(MemberStatus).map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Extra Fields Section */}
                {(appSettings.memberFields || []).filter(f => f.group === 'extra').length > 0 && (
                  <div>
                    <p className="text-xs font-black text-purple-600 uppercase tracking-widest mb-3 border-b border-purple-100 pb-2">بيانات إضافية</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(appSettings.memberFields || []).filter(f => f.group === 'extra').map(field => {
                        const val = formData.additionalData?.[field.key] || '';
                        const onChange = (v: string) => handleUpdateAdditionalData(field.key, v);

                        if (field.type === 'select' && field.options) return (
                          <div key={field.key} className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                            <select required={field.required} className="w-full px-4 py-3 border border-gray-100 rounded-2xl bg-gray-50 focus:bg-white outline-none font-bold" value={val} onChange={e => onChange(e.target.value)}>
                              <option value="">اختر...</option>
                              {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                        );
                        if (field.type === 'textarea') return (
                          <div key={field.key} className="md:col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                            <textarea required={field.required} className="w-full px-4 py-3 border border-gray-100 rounded-2xl bg-gray-50 focus:bg-white outline-none font-bold resize-none" rows={2} value={val} onChange={e => onChange(e.target.value)} />
                          </div>
                        );
                        if (field.type === 'number') return (
                          <div key={field.key} className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                            <input required={field.required} type="number" className="w-full px-4 py-3 border border-gray-100 rounded-2xl bg-gray-50 focus:bg-white outline-none font-bold" value={val} onChange={e => onChange(e.target.value)} />
                          </div>
                        );
                        // default: text or date
                        return (
                          <div key={field.key} className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                            <input required={field.required} type={field.type === 'date' ? 'date' : 'text'} className="w-full px-4 py-3 border border-gray-100 rounded-2xl bg-gray-50 focus:bg-white outline-none font-bold" value={val} onChange={e => onChange(e.target.value)} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="px-8 py-6 border-t border-gray-50 flex justify-end gap-3 bg-gray-50/50">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-4 text-gray-400 font-bold">إلغاء</button>
              <button type="submit" form="memberForm" className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 active:scale-95 transition-all">حفظ البيانات</button>
            </div>
          </div>
        </div>
      )}

      <CollectSubscriptionModal
        isOpen={!!payMemberId}
        onClose={() => setPayMemberId(null)}
        memberId={payMemberId || undefined}
      />
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
    <p className="text-[10px] text-gray-400 font-black mb-1 uppercase tracking-widest">{label}</p>
    <p className="text-sm font-black text-gray-800">{value}</p>
  </div>
);

export default Members;