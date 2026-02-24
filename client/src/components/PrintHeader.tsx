import React from 'react';
import { useApp } from '../contexts/AppContext';
import { Phone, Mail, MapPin, Globe } from 'lucide-react';

interface PrintHeaderProps {
  title?: string;
}

const PrintHeader = ({ title }: PrintHeaderProps) => {
  const { appSettings } = useApp();
  const currentDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="hidden print:flex flex-col w-full mb-8 font-sans">
      {/* Top Section */}
      <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-2">
        
        {/* Right: Logo & Org Name */}
        <div className="flex items-center gap-4">
          {appSettings.logoUrl && (
            <img src={appSettings.logoUrl} alt="Logo" className="w-24 h-24 object-contain" />
          )}
          <div className="flex flex-col justify-center">
            <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
              {appSettings.organizationName || 'اسم الجمعية'}
            </h1>
            {appSettings.registrationNumber && (
              <p className="text-sm text-gray-600 font-medium mt-1">
                رقم الترخيص: {appSettings.registrationNumber}
              </p>
            )}
            {title && (
              <h2 className="text-xl font-bold text-gray-800 mt-2 bg-gray-100 px-3 py-1 rounded w-fit border border-gray-300">
                {title}
              </h2>
            )}
          </div>
        </div>

        {/* Left: Meta Info */}
        <div className="text-left flex flex-col items-end justify-center h-full">
            <div className="text-sm font-bold text-gray-500 mb-1">تاريخ التقرير</div>
            <div className="text-lg font-bold text-gray-900">{currentDate}</div>
            <div className="mt-4 text-xs text-gray-400">نظام الإدارة الإلكتروني</div>
        </div>
      </div>

      {/* Bottom Section: Contact Info Stripe */}
      <div className="flex justify-between items-center text-xs font-medium text-gray-600 px-2">
        {appSettings.address && (
           <div className="flex items-center gap-1"><MapPin size={12} /> {appSettings.address}</div>
        )}
        {appSettings.phone && (
           <div className="flex items-center gap-1" dir="ltr"><Phone size={12} /> {appSettings.phone}</div>
        )}
        {appSettings.email && (
           <div className="flex items-center gap-1"><Mail size={12} /> {appSettings.email}</div>
        )}
        {appSettings.website && (
           <div className="flex items-center gap-1"><Globe size={12} /> {appSettings.website}</div>
        )}
      </div>
    </div>
  );
};

export default PrintHeader;