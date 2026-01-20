import { User, Globe, Bell } from 'lucide-react';
import { User as UserType } from '../types';
import { useLang } from '../context/LanguageContext';

interface HeaderProps {
  user: UserType;
  onProfileClick: () => void;
  onNotificationBellClick?: () => void;
  notifications?: any[];
  onMarkAsRead?: (item: any) => void;
  unreadCount?: number;
  onSendToAll?: (message: string) => void;
  notificationSearch?: string;
  onNotificationSearchChange?: (value: string) => void;
}

export default function Header({
  user,
  onProfileClick,
  onNotificationBellClick,
  unreadCount = 0,
}: HeaderProps) {
  const { lang, toggleLang, t } = useLang();

  return (
    <header className="w-full py-3 px-6 bg-white border-b border-[#E8E8E8] shadow-sm">
      <div className="flex items-center justify-between w-full">

        {/* Left: Logo and Company Name */}
        <div className="flex items-center gap-3">
          <img
            src="/assets/logo.png"
            alt={t('brand.name')}
            className="h-9 w-auto object-contain"
          />
          <h1 className="text-2xl font-bold tracking-tight uppercase text-[#232333]">
            {t('brand.name')}
          </h1>
        </div>

        {/* Right: Notification Bell + Language + Profile */}
        <div className="flex items-center gap-2">

          {/* Notification Bell */}
          <button
            onClick={onNotificationBellClick}
            className="p-2.5 hover:bg-[#F6F6F6] rounded-xl transition-colors relative"
            title={t('notificationsPanel.toggle')}
          >
            <Bell className="w-5 h-5 text-[#6E7680] hover:text-[#232333] transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#1d2089] text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Language Toggle */}
          <button
            onClick={toggleLang}
            className="p-2.5 hover:bg-[#F6F6F6] rounded-xl transition-colors relative"
            title={
              lang === 'ja'
                ? t('language.switchToEnglish')
                : t('language.switchToJapanese')
            }
          >
            <Globe className="w-5 h-5 text-[#6E7680] hover:text-[#232333] transition-colors" />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#1d2089] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {lang === 'ja' ? 'JP' : 'EN'}
            </span>
          </button>

          {/* Profile */}
          <button
            onClick={onProfileClick}
            className="flex items-center gap-3 px-3 py-2 hover:bg-[#F6F6F6] rounded-xl transition-colors ml-2"
          >
            <div className="text-right">
              <p className="text-sm font-semibold text-[#232333]">{user.name}</p>
              <p className="text-xs text-[#6E7680]">
                {user.department}
              </p>
            </div>
            <div className="w-9 h-9 bg-[#1d2089] rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          </button>

        </div>
      </div>
    </header>
  );
}
