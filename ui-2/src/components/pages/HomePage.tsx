import {
  MessageSquare,
  History,
  Shield,
  BarChart3,
  FileText,
  Users,
  Activity,
  Send,
} from 'lucide-react';
import { User, FeatureType } from '../../types';
import { useLang } from '../../context/LanguageContext';
import Header from '../layout/Header';
import ChatInterface from '../chat/ChatInterface';
import HistoryPage from '../chat/HistoryPage';
import NotificationsPanel from '../notifications/NotificationsPanel';
import AdminDashboard from '../admin/AdminDashboard';
import InlineContactAdmin from '../contact/InlineContactAdmin';
import { useRef, useState } from 'react';

interface HomePageProps {
  user: User;
  onFeatureClick: (feature: FeatureType) => void;
  onProfileClick: () => void;
  notifications?: any[];
  onMarkAsRead?: (item: any) => void;
  unreadCount?: number;
  onSendToAll?: (message: string) => void;
  onSaveToHistory?: (query: string, answer: string, source: any) => void;
  history?: any[];
  onNotificationBellClick?: () => void;
}

type Section =
  | 'chat'
  | 'history'
  | 'contact'
  | 'analytics'
  | 'documents'
  | 'users'
  | 'activity';

export default function HomePage({
  user,
  onProfileClick,
  notifications = [],
  onMarkAsRead,
  unreadCount = 0,
  onSendToAll,
  onSaveToHistory,
  history = [],
  onNotificationBellClick,
}: HomePageProps) {
  const { t } = useLang();

  const [activeSection, setActiveSection] = useState<Section>(
    user.role === 'admin' ? 'analytics' : 'chat'
  );

  const [chatFocusTick, setChatFocusTick] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [notifSearch, setNotifSearch] = useState('');
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <Header
        user={user}
        onProfileClick={onProfileClick}
        onNotificationBellClick={() => {
          onNotificationBellClick?.();
          const next = !showNotificationPanel;
          setShowNotificationPanel(next);

          if (next && onMarkAsRead) {
            const unreadItems = (notifications || []).filter((it: any) => it && it.read === false);
            for (const item of unreadItems) {
              onMarkAsRead(item);
            }
          }
        }}
        notifications={notifications}
        onMarkAsRead={onMarkAsRead}
        unreadCount={unreadCount}
        onSendToAll={onSendToAll}
        notificationSearch={notifSearch}
        onNotificationSearchChange={setNotifSearch}
      />

      {/* Main */}
      <main className="mac-glass-page flex-1 pt-4 px-3 lg:pl-6 lg:pr-6 pb-4 overflow-hidden bg-[#F6F6F6] dark:bg-[#0f0f23] transition-colors">
        <div className={`h-full gap-4 overflow-hidden flex flex-col lg:grid ${showNotificationPanel ? 'lg:grid-cols-[72px_1fr_320px]' : 'lg:grid-cols-[72px_1fr]'}`}>
          {/* Sidebar */}
          <aside className="hidden lg:block h-full">
            <div className="left-sidebar h-full rounded-xl overflow-hidden">
              <div className="sidebar-inner h-full overflow-y-auto flex flex-col items-center gap-3 pt-4">
                {sidebarButtons(
                  user.role,
                  activeSection,
                  setActiveSection,
                  setChatFocusTick,
                  t
                )}
              </div>
            </div>
          </aside>

          {/* Main content */}
          <section
            key={activeSection}
            className="relative h-full rounded-xl mac-glass mac-glass-translucent mac-border-highlight mac-tab-animate overflow-hidden flex flex-col"
          >
            {user.role !== 'admin' && activeSection === 'chat' && (
              <ChatInterface
                onSaveToHistory={(q, a, s) => onSaveToHistory?.(q, a, s)}
                focusSignal={chatFocusTick}
                onUserTyping={setIsTyping}
              />
            )}

            {user.role !== 'admin' && activeSection === 'history' && (
              <HistoryPage history={history as any} />
            )}

            {user.role !== 'admin' && activeSection === 'contact' && (
              <InlineContactAdmin userId={user.employeeId} />
            )}

            {user.role === 'admin' && (
              <AdminDashboard
                activeTab={activeSection}
                onTabChange={(t) => setActiveSection(t as Section)}
                initialTab="analytics"
              />
            )}
          </section>

          {/* Notifications */}
          {showNotificationPanel && (
            <section
              ref={rightPanelRef}
              className="hidden lg:block h-full rounded-xl mac-glass mac-glass-translucent mac-border-highlight shadow-sm overflow-y-auto"
            >
              <NotificationsPanel
                items={notifications as any}
                searchTerm={notifSearch}
                onMarkAsRead={onMarkAsRead}
                onSearchChange={setNotifSearch}
                dimmed={isTyping}
                currentViewerId={user.employeeId}
                currentViewerRole={user.role}
              />
            </section>
          )}
        </div>
      </main>

      {/* Mobile nav */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-[#E8E8E8] bg-white shadow-lg">
        <nav className="flex justify-around py-2">
          {navButtons(
            user.role,
            activeSection,
            setActiveSection,
            setChatFocusTick,
            t,
            true
          )}
        </nav>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function navButtons(
  role: string,
  active: Section,
  setActive: (v: Section) => void,
  setChatFocusTick: (fn: any) => void,
  t: (k: string) => string,
  compact = false
) {
  const btn = (key: Section, icon: JSX.Element) => (
    <button
      key={key}
      title={t(`nav.${key}`)}
      aria-label={t(`nav.${key}`)}
      onClick={() => {
        setActive(key);
        if (key === 'chat') setChatFocusTick((v: number) => v + 1);
      }}
      className={`${
        compact ? 'w-10 h-10' : 'w-12 h-12'
      } flex items-center justify-center rounded-xl transition-all
        ${active === key ? 'bg-[#1d2089] text-white' : 'text-[#6E7680] hover:bg-[#F0F4FF] hover:text-[#1d2089]'}`}
    >
      {icon}
    </button>
  );

  return role !== 'admin'
    ? [
        btn('chat', <MessageSquare className="w-5 h-5" />),
        btn('history', <History className="w-5 h-5" />),
        btn('contact', <Shield className="w-5 h-5" />),
      ]
    : [
        btn('analytics', <BarChart3 className="w-5 h-5" />),
        btn('documents', <FileText className="w-5 h-5" />),
        btn('users', <Users className="w-5 h-5" />),
        btn('chat', <MessageSquare className="w-5 h-5" />),
        btn('activity', <Activity className="w-5 h-5" />),
        btn('contact', <Send className="w-5 h-5" />),
      ];
}

function sidebarButtons(
  role: string,
  active: Section,
  setActive: (v: Section) => void,
  setChatFocusTick: (fn: any) => void,
  t: (k: string) => string
) {
  const create = (key: Section, icon: JSX.Element) => (
    <button
      key={key}
      title={t(`nav.${key}`)}
      aria-label={t(`nav.${key}`)}
      onClick={() => {
        setActive(key);
        if (key === 'chat') setChatFocusTick((v: number) => v + 1);
      }}
      className={`sidebar-btn ${active === key ? 'active' : ''}`}
    >
      {icon}
    </button>
  );

  return role !== 'admin' ? (
    <>
      {create('chat', <MessageSquare className="w-5 h-5" />)}
      {create('history', <History className="w-5 h-5" />)}
      {create('contact', <Shield className="w-5 h-5" />)}
    </>
  ) : (
    <>
      {create('analytics', <BarChart3 className="w-5 h-5" />)}
      {create('documents', <FileText className="w-5 h-5" />)}
      {create('users', <Users className="w-5 h-5" />)}
      {create('chat', <MessageSquare className="w-5 h-5" />)}
      {create('activity', <Activity className="w-5 h-5" />)}
      {create('contact', <Send className="w-5 h-5" />)}
    </>
  );
}
