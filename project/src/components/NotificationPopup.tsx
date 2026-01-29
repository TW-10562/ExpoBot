import { Clock, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Notification } from '../types';

interface NotificationPopupProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
}

export default function NotificationPopup({
  notifications,
  onMarkAsRead,
}: NotificationPopupProps) {
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'announcement':
        return <Info className="w-5 h-5 text-blue-400" />;
      case 'update':
        return <AlertCircle className="w-5 h-5 text-orange-400" />;
      case 'processing':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      default:
        return <Info className="w-5 h-5 text-slate-400" />;
    }
  };

  const getBackgroundColor = (type: Notification['type']) => {
    switch (type) {
      case 'announcement':
        return 'bg-blue-500/10 border-blue-400/30';
      case 'update':
        return 'bg-orange-500/10 border-orange-400/30';
      case 'processing':
        return 'bg-green-500/10 border-green-400/30';
      default:
        return 'bg-slate-500/10 border-slate-400/30';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-white/10 bg-black/20">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Notifications</h3>
          <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs font-medium rounded-full">
            {notifications.filter((n) => !n.read).length} unread
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <CheckCircle className="w-16 h-16 text-slate-600 mb-4" />
            <p className="text-xl text-slate-400 mb-2">All caught up!</p>
            <p className="text-sm text-slate-500">No new notifications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-xl p-4 border transition-all ${
                  notification.read
                    ? 'bg-white/5 border-white/10 opacity-60'
                    : `${getBackgroundColor(notification.type)} border`
                }`}
              >
                <div className="flex gap-3">
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                      notification.type === 'announcement'
                        ? 'bg-blue-500/20'
                        : notification.type === 'update'
                        ? 'bg-orange-500/20'
                        : 'bg-green-500/20'
                    }`}
                  >
                    {getIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-white font-medium">{notification.title}</h4>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-sm text-slate-300 mb-2">{notification.message}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(notification.timestamp)}</span>
                      </div>
                      {!notification.read && (
                        <button
                          onClick={() => onMarkAsRead(notification.id)}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
