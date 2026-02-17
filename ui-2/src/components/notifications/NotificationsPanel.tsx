import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Mail, MailOpen, Send } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';

interface NotificationItem {
  id: string;
  subject?: string;
  title?: string;
  message?: string;
  text?: string;
  timestamp?: number | string | Date;
  read?: boolean;
  is_broadcast?: boolean;
  notificationId?: number;
  messageId?: number;
  role?: 'admin' | 'user';
  senderId?: string;
  currentViewerId?: string;

  /** IMPORTANT FLAGS - Used to determine if message was sent by viewer */
  isAdminSent?: boolean;
  isUserSent?: boolean;
}

interface NotificationsPanelProps {
  items: NotificationItem[];
  searchTerm?: string;
  onMarkAsRead?: (item: NotificationItem) => void;
  dimmed?: boolean;
  onSearchChange?: (value: string) => void;
  currentViewerId?: string;
  currentViewerRole?: 'admin' | 'user';
}

/* ===================== LOCAL STORAGE HELPERS ===================== */

const getReadStorageKeys = (viewerKey: string) => ({
  notification: `read_notification_ids_${viewerKey}`,
  message: `read_message_ids_${viewerKey}`,
});

const getReadIdsFromStorage = (viewerKey: string) => {
  try {
    const keys = getReadStorageKeys(viewerKey);
    return {
      notificationIds: new Set<number>(
        JSON.parse(localStorage.getItem(keys.notification) || '[]')
      ),
      messageIds: new Set<number>(
        JSON.parse(localStorage.getItem(keys.message) || '[]')
      ),
    };
  } catch {
    return { notificationIds: new Set(), messageIds: new Set() };
  }
};

const addReadIdToStorage = (notificationId: number | undefined, messageId: number | undefined, viewerKey: string) => {
  const { notificationIds, messageIds } = getReadIdsFromStorage(viewerKey);
  const keys = getReadStorageKeys(viewerKey);
  if (notificationId != null) {
    notificationIds.add(notificationId);
    localStorage.setItem(
      keys.notification,
      JSON.stringify([...notificationIds])
    );
  }
  if (messageId != null) {
    messageIds.add(messageId);
    localStorage.setItem(
      keys.message,
      JSON.stringify([...messageIds])
    );
  }
};

const isItemReadInStorage = (item: NotificationItem, viewerKey: string) => {
  const { notificationIds, messageIds } = getReadIdsFromStorage(viewerKey);
  return (
    (item.notificationId != null &&
      notificationIds.has(item.notificationId)) ||
    (item.messageId != null && messageIds.has(item.messageId))
  );
};

/* ===================== COMPONENT ===================== */

export default function NotificationsPanel({
  items,
  searchTerm = '',
  onMarkAsRead,
  dimmed = false,
  onSearchChange,
  currentViewerId,
  currentViewerRole = 'user',
}: NotificationsPanelProps) {
  const { t } = useLang();
  const viewerKey = currentViewerId || 'anonymous';
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<NotificationItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  /* ---------- INIT ---------- */
  useEffect(() => {
    const map = new Map<string, NotificationItem>();
    for (const it of items || []) {
      if (!it?.id) continue;
      const read = isItemReadInStorage(it, viewerKey) || it.read;
      map.set(it.id, { ...it, read });
    }
    setLocalItems([...map.values()]);
    setIsInitialized(true);
  }, [items, viewerKey]);

  /* ---------- FILTER ---------- */
  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return [...localItems]
      .sort(
        (a, b) =>
          new Date(b.timestamp || 0).getTime() -
          new Date(a.timestamp || 0).getTime()
      )
      .filter(
        (n) =>
          !q ||
          (n.subject || n.title || '')
            .toLowerCase()
            .includes(q) ||
          (n.message || n.text || '').toLowerCase().includes(q)
      );
  }, [localItems, searchTerm]);

  /* ===================== RENDER ===================== */

  return (
    <aside
      className={`h-full w-full bg-white dark:bg-dark-surface flex flex-col overflow-hidden transition-colors ${
        dimmed ? 'opacity-60' : 'opacity-100'
      }`}
    >
      {/* HEADER */}
      <div className="p-4 border-b border-[#E8E8E8] dark:border-dark-border dark:bg-dark-bg-primary flex items-center gap-3 flex-shrink-0 transition-colors">
        <div className="p-2 bg-[#F0F4FF] dark:bg-blue-900/30 rounded-lg transition-colors">
          <Bell className="w-4 h-4 text-[#1e228a] dark:text-[#00CCFF] flex-shrink-0 transition-colors" />
        </div>
        <h3 className="text-sm font-semibold text-[#232333] dark:text-dark-text flex-1 truncate transition-colors">
          {t('notificationsPanel.title')}
        </h3>
        {onSearchChange && (
          <input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('notificationsPanel.searchPlaceholder')}
            className="bg-[#F6F6F6] dark:bg-dark-border text-xs text-[#232333] dark:text-dark-text px-3 py-1.5 rounded-lg border border-[#E8E8E8] dark:border-dark-border flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[#1e228a] dark:focus:ring-[#00CCFF] transition-colors"
          />
        )}
      </div>

      {/* MESSAGE LIST - Only vertical scrolling */}
      <div 
        ref={containerRef} 
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2 w-full"
        style={{ overscrollBehavior: 'contain' }}
      >
        {!isInitialized ? (
          <p className="text-[#6E7680] dark:text-white/70 text-center text-xs">
            {t('notificationsPanel.loading')}
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-[#6E7680] dark:text-white/70 text-center text-xs">
            {searchTerm ? t('notificationsPanel.noResults') : t('notificationsPanel.noNotifications')}
          </p>
        ) : (
          filtered.map((message) => {
            const messageRead = message.read === true;

            /* ===================== VIEWER PERSPECTIVE COMPUTATION ===================== */
            // Step 1: Determine if message was sent by current viewer
            // Use senderId comparison. For admins, their ID might be 'admin' or their employeeId
            let isSentByViewer = false;
            
            if (currentViewerId && message.senderId) {
              // Direct ID comparison
              isSentByViewer = message.senderId === currentViewerId;
              // For admins: if senderId is 'admin' and viewer is admin, it's sent by viewer
              if (!isSentByViewer && currentViewerRole === 'admin' && message.senderId === 'admin') {
                isSentByViewer = true;
              }
            }

            // Step 2: If not sent by viewer, it was received
            const isReceivedByViewer = !isSentByViewer;

            // Step 3: A message is "new" if it was received and not yet read
            const isNew = isReceivedByViewer && !messageRead;

            /* ===================== DETERMINE UI STATE ===================== */
            let containerClasses = '';
            let textColor = '';
            let iconColor = '';
            let badgeColor = '';
            let badgeText = '';
            let icon = null;
            let showMarkAsReadBtn = false;

            if (isSentByViewer) {
              // SENT MESSAGE STYLING
              // Light theme: white bg with green border
              // Dark theme: green background with glassmorphism
              containerClasses = 'bg-white dark:bg-green-900/40 shadow-sm dark:shadow-lg border-2 dark:border border-green-500 dark:border-green-500/30 rounded-xl dark:backdrop-blur-md';
              
              textColor = 'text-black dark:text-white';
              iconColor = 'text-green-600 dark:text-green-300';
              icon = <Send className={`w-4 h-4 ${iconColor} flex-shrink-0`} />;
              badgeColor = '';
              badgeText = '';
            } else if (isNew) {
              // NEW MESSAGE STYLING (received, unread)
              // Light theme: white bg with blue border
              // Dark theme: blue background with glassmorphism
              containerClasses = 'bg-white dark:bg-blue-900/40 shadow-sm dark:shadow-lg border-2 dark:border border-blue-500 dark:border-blue-500/30 rounded-xl dark:backdrop-blur-md';
              
              textColor = 'text-black dark:text-white';
              iconColor = 'text-blue-600 dark:text-blue-300';
              icon = <Mail className={`w-4 h-4 ${iconColor} flex-shrink-0`} />;
              badgeColor = 'bg-[#1e228a] dark:bg-blue-500 text-white';
              badgeText = t('notificationsPanel.new');
              showMarkAsReadBtn = true;
            } else if (isReceivedByViewer && messageRead) {
              // READ MESSAGE STYLING (received, read)
              // Light theme: white bg with blue border
              // Dark theme: blue background with glassmorphism (more subtle)
              containerClasses = 'bg-white dark:bg-blue-900/20 shadow-sm dark:shadow-lg border-2 dark:border border-blue-300 dark:border-blue-500/20 rounded-xl dark:backdrop-blur-md';
              
              textColor = 'text-black dark:text-white';
              iconColor = 'text-gray-500 dark:text-blue-200/60';
              icon = <MailOpen className={`w-4 h-4 ${iconColor} flex-shrink-0`} />;
            }

            const isExpanded = expandedId === message.id;
            const messageText = message.message || message.text || '';
            const messageTitle = message.subject || message.title || t('notificationsPanel.noTitle') || 'Untitled';

            const handleMarkAsRead = () => {
              addReadIdToStorage(message.notificationId, message.messageId, viewerKey);
              setLocalItems((prev) =>
                prev.map((item) =>
                  item.id === message.id ? { ...item, read: true } : item
                )
              );
              onMarkAsRead?.(message);
            };

            const handleToggleExpand = () => {
              setExpandedId(isExpanded ? null : message.id);
            };

            return (
              <div
                key={message.id}
                className={`p-3 transition-all overflow-hidden w-full ${containerClasses}`}
              >
                {/* HEADER - For SENT messages: Icon + Title on same line (no badge) */}
                {isSentByViewer && (
                  <div className="flex gap-2 items-center mb-2 w-full min-w-0">
                    {icon}
                    <h4 
                      className={`text-sm font-semibold ${textColor} cursor-pointer truncate`}
                      onClick={handleToggleExpand}
                      title={messageTitle}
                    >
                      {messageTitle}
                    </h4>
                  </div>
                )}

                {/* HEADER - For READ messages: Icon + Title on same line */}
                {!isSentByViewer && isReceivedByViewer && messageRead && (
                  <div className="flex gap-2 items-center mb-2 w-full min-w-0">
                    {icon}
                    <h4 
                      className={`text-sm font-semibold ${textColor} cursor-pointer truncate`}
                      onClick={handleToggleExpand}
                      title={messageTitle}
                    >
                      {messageTitle}
                    </h4>
                  </div>
                )}

                {/* HEADER - For NEW messages: Icon on top, Title and badges below */}
                {isNew && (
                  <div className="flex gap-2 items-start mb-2 w-full">
                    {icon}
                    <div className="flex-1 flex flex-col gap-1 min-w-0">
                      {/* NEW Badge and Mark as Read Button */}
                      <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                        {badgeText && (
                          <span className={`text-[10px] px-2 py-1 rounded whitespace-nowrap flex-shrink-0 ${badgeColor}`}>
                            {badgeText}
                          </span>
                        )}
                        {showMarkAsReadBtn && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead();
                            }}
                            className="text-[10px] text-white bg-[#1e228a] dark:bg-blue-500 hover:bg-[#161a5a] dark:hover:bg-blue-600 px-2 py-1 rounded-md whitespace-nowrap flex-shrink-0 transition-colors"
                          >
                            {t('notificationsPanel.markAsRead')}
                          </button>
                        )}
                      </div>

                      {/* Title - Truncated when collapsed, wrapped when expanded */}
                      <h4 
                        className={`text-sm font-semibold ${textColor} cursor-pointer ${!isExpanded ? 'truncate' : 'break-words whitespace-normal'}`}
                        onClick={handleToggleExpand}
                        title={messageTitle}
                      >
                        {messageTitle}
                      </h4>
                    </div>
                  </div>
                )}

                {/* CONTENT AREA - Collapsible */}
                {!isExpanded ? (
                  // COLLAPSED VIEW: Show preview
                  <div 
                    className="cursor-pointer text-xs space-y-1 ml-6"
                    onClick={handleToggleExpand}
                  >
                    <p className={`line-clamp-2 break-words ${textColor} opacity-80`}>
                      {messageText || t('notificationsPanel.noContent') || 'No content'}
                    </p>
                    <p className="text-[10px] text-black/50 dark:text-white/50 italic">
                      {t('notificationsPanel.clickToExpand') || 'Click to expand'}
                    </p>
                  </div>
                ) : (
                  // EXPANDED VIEW: Show full content
                  <div 
                    className="mt-2 pt-2 border-t border-gray-200 dark:border-white/20 ml-6 space-y-2"
                    onClick={handleToggleExpand}
                  >
                    <p 
                      className={`text-xs whitespace-pre-wrap break-words overflow-hidden w-full ${textColor}`}
                      style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
                    >
                      <span>{messageText}</span>
                    </p>
                    
                    {/* Timestamp - if available */}
                    {message.timestamp && (
                      <p className="text-[10px] text-black/60 dark:text-white/60">
                        {new Date(message.timestamp).toLocaleString()}
                      </p>
                    )}

                    {/* Click to collapse hint - bottom right */}
                    <p className="text-[10px] text-black/50 dark:text-white/50 text-right italic cursor-pointer hover:text-black/70 dark:hover:text-white/70">
                      {t('notificationsPanel.clickToCollapse') || 'Click to collapse'}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
