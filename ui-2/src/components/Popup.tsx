import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLang } from '../context/LanguageContext';
interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Popup({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-4xl',
}: PopupProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
    >
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        className={`relative w-full ${maxWidth} h-[85vh] bg-white rounded-2xl shadow-2xl border border-[#E8E8E8] flex flex-col overflow-hidden transition-all duration-300 ${
          isAnimating
            ? 'scale-100 translate-y-0 opacity-100'
            : 'scale-90 translate-y-8 opacity-0'
        }`}
        style={{
          animation: isAnimating ? 'popupBounce 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8] bg-[#F6F6F6]">
          <h2 className="text-2xl font-semibold text-[#232333]">
  {t('common.profile')}
</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-[#E8E8E8] rounded-xl transition-colors group"
          >
            <X className="w-6 h-6 text-[#6E7680] group-hover:text-[#232333] transition-colors" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden bg-white">{children}</div>
      </div>

      <style>{`
        @keyframes popupBounce {
          0% {
            transform: scale(0.8) translateY(50px);
            opacity: 0;
          }
          50% {
            transform: scale(1.02) translateY(-5px);
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
