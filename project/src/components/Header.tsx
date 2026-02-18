import { Building2, Bell, User, Settings } from 'lucide-react';
import { User as UserType } from '../types';

interface HeaderProps {
  user: UserType;
  onProfileClick: () => void;
  onNotificationClick: () => void;
  onSettingsClick: () => void; // NEW
  unreadCount?: number;
}

export default function Header({
  user,
  onProfileClick,
  onNotificationClick,
  onSettingsClick, // NEW
  unreadCount = 0,
}: HeaderProps) {
  return (
    <header className="w-full py-4 px-8 bg-black/20 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-8 h-8 text-blue-400" />
          <h1 className="text-xl font-semibold text-white">
            HR Policy Digital Twin
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button
            onClick={onNotificationClick}
            className="relative p-2 hover:bg-white/10 rounded-lg transition-colors group"
          >
            <Bell className="w-6 h-6 text-slate-300 group-hover:text-white transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Settings button added here */}
          <button
            onClick={onSettingsClick}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
          >
            <Settings className="w-6 h-6 text-slate-300 group-hover:text-white transition-colors" />
          </button>

          {/* Profile */}
          <button
            onClick={onProfileClick}
            className="flex items-center gap-3 px-4 py-2 hover:bg-white/10 rounded-lg transition-colors group"
          >
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-slate-400">{user.department}</p>
            </div>
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
