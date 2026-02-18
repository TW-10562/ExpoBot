import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLang } from '../../context/LanguageContext';
 // make sure path is correct

interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string; // optional if we use t('common.profile') by default
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
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-all duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Popup Container */}
      <div
        className={`relative w-full ${maxWidth} h-[85vh]
          bg-white/80 dark:bg-black/40
          backdrop-blur-xl
          border border-gray-200 dark:border-white/10
          rounded-2xl
          shadow-2xl
          flex flex-col overflow-hidden
          transition-all duration-300
          ${
            isAnimating
              ? 'scale-100 translate-y-0 opacity-100'
              : 'scale-90 translate-y-8 opacity-0'
          }`}
        style={{
          animation: isAnimating
            ? 'popupBounce 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
            : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="
            flex items-center justify-between
            px-6 py-4
            border-b
            border-gray-200 dark:border-white/10
            bg-white/60 dark:bg-black/50
            backdrop-blur-md
          "
        >
         <h2 className="text-2xl font-semibold text-black dark:text-white uppercase">
  {title || t('common.profile')}
</h2>


          <button
            onClick={handleClose}
            className="
              p-2 rounded-lg transition-colors
              hover:bg-gray-200 dark:hover:bg-white/10
              group
            "
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden">{children}</div>
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
