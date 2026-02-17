import { User, Globe, Bell, Moon, Sun } from 'lucide-react';
import { User as UserType } from '../../types';
import { useLang } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

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
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="w-full py-3 px-6 bg-surface dark:bg-dark-bg-primary border-b border-default shadow-sm transition-colors">
      <div className="flex items-center justify-between w-full">

        {/* Left: Logo and Company Name */}
        <div className="flex items-center gap-3">
          <img
            src="/assets/logo.png"
            alt={t('brand.name')}
            className="h-9 w-auto object-contain dark:brightness-0 dark:invert"
          />
          <h1 className="text-2xl font-bold tracking-tight uppercase text-foreground dark:text-dark-text">
            {t('brand.name')}
          </h1>
        </div>

        {/* Right: Notification Bell + Theme + Language + Profile */}
        <div className="flex items-center gap-2">

          {/* Notification Bell */}
          <button
            onClick={onNotificationBellClick}
            className="p-2.5 hover:bg-surface-alt dark:hover:bg-[#00CCFF] rounded-xl transition-colors relative"
            title={t('notificationsPanel.toggle')}
          >
            <Bell className="w-5 h-5 text-icon-muted dark:text-dark-text-muted dark:hover:text-black hover:text-foreground transition-colors icon-current" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#1e228a] dark:bg-[#00CCFF] text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 hover:bg-[#F6F6F6] dark:hover:bg-[#00CCFF] rounded-xl transition-colors"
            title={theme === 'light' ? t('theme.switchToDark') : t('theme.switchToLight')}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-icon-muted hover:text-foreground transition-colors icon-current" />
            ) : (
              <Sun className="w-5 h-5 text-dark-text-muted dark:hover:text-black hover:text-dark-accent-blue transition-colors icon-current" />
            )} 
          </button>

          {/* Language Toggle */}
          <button
            onClick={toggleLang}
            className="p-2.5 hover:bg-surface-alt dark:hover:bg-[#00CCFF] rounded-xl transition-colors relative"
            title={
              lang === 'ja'
                ? t('language.switchToEnglish')
                : t('language.switchToJapanese')
            }
          >
            <Globe className="w-5 h-5 text-icon-muted dark:text-dark-text-muted dark:hover:text-black hover:text-foreground transition-colors icon-current" />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#1e228a] dark:bg-[#00CCFF] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {lang === 'ja' ? 'JP' : 'EN'}
            </span>
          </button> 

          {/* Profile */}
          <button
            onClick={onProfileClick}
            className="flex items-center gap-3 px-3 py-2 hover:bg-surface-alt dark:hover:bg-[#00CCFF] rounded-xl transition-colors ml-2"
          >
            <div className="text-right dark:group-hover:text-black">
              <p className="text-sm font-semibold text-foreground dark:hover:text-black dark:text-dark-text transition-colors">{user.name}</p>
              <p className="text-xs text-muted dark:hover:text-black/70 dark:text-dark-text-muted transition-colors">
                {user.department}
              </p>
            </div>
            <div className="w-9 h-9 bg-accent-strong dark:bg-accent-strong rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-on-accent icon-current" />
            </div>
          </button>

        </div>
      </div>
    </header>
  );
}
