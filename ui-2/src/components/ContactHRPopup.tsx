import { X, AlertCircle } from 'lucide-react';
import { useLang } from '../context/LanguageContext'; 
interface ContactHRPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}
 
export default function ContactHRPopup({
  isOpen,
  onClose,
  title = 'Contact HR',
  message = 'Please contact your HR department for assistance.'
}: ContactHRPopupProps) {
  const { t } = useLang();
  if (!isOpen) return null;
 
  return (
      <div className="bg-white rounded-2xl w-full max-w-md border border-[#E8E8E8] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E8E8E8] bg-[#F6F6F6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F0F4FF] rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-[#1d2089]" />
            </div>
            <h3 className="font-semibold text-[#232333] text-lg">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[#E8E8E8] text-[#6E7680] hover:text-[#232333] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
 
        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-[#F0F4FF] border border-[#1d2089]/20 rounded-xl p-4">
            <p className="text-[#232333] text-center">
              {message}
            </p>
          </div>
 
          <div className="space-y-3 text-sm text-[#6E7680]">
            <p className="font-medium text-[#232333]">{t('hrContact.title')}</p>

      <p>
        📧 {t('hrContact.email')}:{" "}
        <span className="text-[#1d2089]">hr@company.com</span>
      </p>

      <p>
        📞 {t('hrContact.phone')}:{" "}
        <span className="text-[#1d2089]">+1 (XXX) XXX-XXXX</span>
      </p>

      <p>
        🏢 {t('hrContact.office')}:{" "}
        <span className="text-[#1d2089]">
          {t('hrContact.officeLocation')}
        </span>
      </p>
          </div>
        </div>
      </div>
  );
}
 
 