import { useState, useEffect } from 'react';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './components/pages/LoginPage';
import HomePage from './components/pages/HomePage';
import Popup from './components/modals/Popup';
import ChatInterface from './components/chat/ChatInterface';
import HistoryPage from './components/chat/HistoryPage';
import ProfilePopup from './components/modals/ProfilePopup';
import AdminDashboard from './components/admin/AdminDashboard';
// @ts-ignore
import Messenger from './components/chat/Messenger';
// @ts-ignore
import ContactAdminPopup from './components/modals/ContactAdminPopup';
import BroadcastModal from './components/modals/BroadcastModal';
import { User, FeatureType, HistoryItem } from './types';
import { getNotifications as apiGetNotifications, createSupportTicket } from './api/support';
import { getToken } from './api/auth';
 
 
function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [activeFeature, setActiveFeature] = useState<FeatureType | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showContactAdminModal, setShowContactAdminModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificationBellClicked, setNotificationBellClicked] = useState(false);

  // FRESH notification count logic - completely independent from old logic
  const computeNotificationCount = (messagesList: any[], userRole: string): number => {
    if (!Array.isArray(messagesList) || notificationBellClicked) return 0;
    return messagesList.filter((msg: any) => {
      if (userRole === 'admin') return msg.senderRole === 'user' && !msg.read;
      return msg.senderRole === 'admin' && !msg.read;
    }).length;
  };

  // Local persistence for read states across refresh
  const getViewerKey = (u: User | null) => u?.employeeId || 'anonymous';
  const getReadStorageKeys = (viewerKey: string) => ({
    notification: `read_notification_ids_${viewerKey}`,
    message: `read_message_ids_${viewerKey}`,
  });

  const getReadSets = (viewerKey: string) => {
    try {
      const keys = getReadStorageKeys(viewerKey);
      const n = JSON.parse(localStorage.getItem(keys.notification) || '[]');
      const m = JSON.parse(localStorage.getItem(keys.message) || '[]');
      return { n: new Set<number>(n), m: new Set<number>(m) };
    } catch {
      return { n: new Set<number>(), m: new Set<number>() };
    }
  };
  const addReadId = (notificationId: number | undefined, messageId: number | undefined, viewerKey: string) => {
    const { n, m } = getReadSets(viewerKey);
    const keys = getReadStorageKeys(viewerKey);
    let changedN = false, changedM = false;
    if (typeof notificationId === 'number') { n.add(notificationId); changedN = true; }
    if (typeof messageId === 'number') { m.add(messageId); changedM = true; }
    if (changedN) localStorage.setItem(keys.notification, JSON.stringify(Array.from(n)));
    if (changedM) localStorage.setItem(keys.message, JSON.stringify(Array.from(m)));
  };
  const applyPersistentRead = (arr: any[], viewerKey: string) => {
    if (!Array.isArray(arr)) return [];
    const { n, m } = getReadSets(viewerKey);
    return arr.map((it) => {
      if (!it) return it; // Defensive check
      // If marked as read in localStorage, always preserve that state
      if (it?.notificationId != null && n.has(it.notificationId)) {
        return { ...it, read: true };
      }
      if (it?.messageId != null && m.has(it.messageId)) {
        return { ...it, read: true };
      }
      // For local-only items (no server IDs), never trust stored `read` to avoid cross-user leakage.
      if (it?.notificationId == null && it?.messageId == null) {
        return { ...it, read: false };
      }

      // Otherwise preserve existing server read state or default to false
      return { ...it, read: it.read ?? false };
    });
  };
  // Compose role-specific notification list consistently
  const composeNotifications = (
    role: 'admin' | 'user',
    server: any[] = [],
    inbox: any[] = [],
    localMsgs: any[] = []
  ) => {
    // Deduplicate messages by ID to prevent duplicates from multiple sources
    const messageMap = new Map<string, any>();

    if (role === 'admin') {
      // Admin sees only messages received from users (not their own sent messages)
      const allMessages = [...inbox].filter((msg) => msg.senderRole === 'user');
      for (const msg of allMessages) {
        if (msg && msg.id) {
          messageMap.set(msg.id, { ...msg });
        }
      }
    } else {
      // User sees:
      // 1. Server notifications (admin broadcasts/messages)
      // 2. Inbox messages (admin replies)
      // 3. Local messages from admin
      // 4. User's own sent messages
      const allMessages = [...(server || []), ...(inbox || [])];
      // Add local messages where admin is the sender
      const localAdminMsgs = (localMsgs || []).filter((m: any) => m.role === 'admin');
      allMessages.push(...localAdminMsgs);
      // Add user's own sent messages
      const localUserMsgs = (localMsgs || []).filter((m: any) => m.role === 'user');
      allMessages.push(...localUserMsgs);
      // Deduplicate - senderId will be used by NotificationsPanel to determine display
      for (const msg of allMessages) {
        if (msg && msg.id) {
          let enriched = { ...msg };
          // Ensure all messages have senderId set
          if (!enriched.senderId) {
            enriched.senderId = enriched.sender || null;
          }
          // For sent messages, always mark as read
          if (enriched.role === 'user' && enriched.senderRole === 'user') {
            enriched.read = true;
          }
          messageMap.set(msg.id, enriched);
        }
      }
    }

    // Return deduplicated, sorted array
    const result = Array.from(messageMap.values());
    result.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return result;
  };
 
  // Load notifications from backend (fallback to localStorage) and when user changes
  useEffect(() => {
    if (user) {
      const load = async () => {
        try {
          const token = getToken();
          const viewerKey = getViewerKey(user);
          
          // Fetch inbox messages - for users: admin replies, for admins: user queries
          let inboxMapped: any[] = [];
          try {
            const inboxRes = await fetch('/dev-api/api/messages/inbox', {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const inboxData = await inboxRes.json();
            if (inboxData?.code === 200 && Array.isArray(inboxData.result?.messages)) {
              const raw = inboxData.result.messages.map((m: any) => {
                if (user.role === 'admin') {
                  // For admins: these are user queries
                  return {
                    id: `msg-${m.id}`,
                    messageId: m.id,
                    sender: m.sender_id,
                    senderId: m.sender_id,
                    senderRole: 'user',
                    role: 'user',
                    subject: m.subject || '',
                    text: m.content,
                    message: m.content,
                    timestamp: new Date(m.created_at || Date.now()).getTime(),
                    read: !!m.is_read,
                  };
                } else {
                  // For users: these are admin replies
                  return {
                    id: `msg-${m.id}`,
                    messageId: m.id,
                    sender: m.sender_id,
                    senderId: m.sender_id,
                    senderRole: 'admin',
                    role: 'admin',
                    subject: m.subject || '',
                    text: m.content,
                    message: m.content,
                    timestamp: new Date(m.created_at || Date.now()).getTime(),
                    read: !!m.is_read,
                  };
                }
              });
              inboxMapped = applyPersistentRead(raw, viewerKey);
            }
          } catch (err) {
            console.error('Failed to fetch inbox messages:', err);
          }

          // Fetch backend notifications (optional - may fail)
          let mappedServer: any[] = [];
          try {
            const res = await apiGetNotifications(false);
            if (res?.code === 200 && Array.isArray(res.result)) {
              mappedServer = res.result.map((n: any) => ({
                id: `srv-${n.id}`,
                notificationId: n.id,
                sender: 'admin',
                senderId: 'admin',
                senderRole: 'admin',
                role: 'admin',
                subject: n.title || '',
                text: n.message,
                message: n.message,
                timestamp: new Date(n.created_at || n.createdAt || Date.now()).getTime(),
                read: !!n.is_read,
              }));
              mappedServer = applyPersistentRead(mappedServer, viewerKey);
            }
          } catch (err) {
            console.error('Failed to fetch notifications:', err);
            // Continue with inbox messages only
          }

          // Merge with local messages (for same-session unsynced items)
          let local: any[] = [];
          try {
            const storedMessages = localStorage.getItem('notifications_messages');
            local = storedMessages ? JSON.parse(storedMessages) : [];
            if (!Array.isArray(local)) local = [];
          } catch {
            local = [];
          }
          
          const combined = composeNotifications(user.role as any, mappedServer, inboxMapped, local);
          setNotifications(Array.isArray(combined) ? combined : []);
          setUnreadCount(computeNotificationCount(combined, user.role));
        } catch (e) {
          console.error('Error loading notifications:', e);
          // Fallback: try to at least show inbox messages
          try {
            const token = getToken();
            const inboxRes = await fetch('/dev-api/api/messages/inbox', {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const inboxData = await inboxRes.json();
            if (inboxData?.code === 200 && Array.isArray(inboxData.result?.messages)) {
              const raw = inboxData.result.messages.map((m: any) => {
                if (user.role === 'admin') {
                  return {
                    id: `msg-${m.id}`,
                    messageId: m.id,
                    sender: m.sender_id,
                    senderId: m.sender_id,
                    senderRole: 'user',
                    role: 'user',
                    subject: m.subject || '',
                    text: m.content,
                    message: m.content,
                    timestamp: new Date(m.created_at || Date.now()).getTime(),
                    read: !!m.is_read,
                  };
                } else {
                  return {
                    id: `msg-${m.id}`,
                    messageId: m.id,
                    sender: m.sender_id,
                    senderId: m.sender_id,
                    senderRole: 'admin',
                    role: 'admin',
                    subject: m.subject || '',
                    text: m.content,
                    message: m.content,
                    timestamp: new Date(m.created_at || Date.now()).getTime(),
                    read: !!m.is_read,
                  };
                }
              });
              const viewerKey = getViewerKey(user);
              const inboxMapped = applyPersistentRead(raw, viewerKey);
              const storedMessages = localStorage.getItem('notifications_messages');
              let local: any[] = [];
              try {
                local = storedMessages ? JSON.parse(storedMessages) : [];
                if (!Array.isArray(local)) local = [];
              } catch {
                local = [];
              }
              const combined = composeNotifications(user.role as any, [], inboxMapped, local);
              setNotifications(Array.isArray(combined) ? combined : []);
              setUnreadCount(computeNotificationCount(combined, user.role));
            } else {
              // Final fallback to localStorage only
              const storedMessages = localStorage.getItem('notifications_messages');
              if (storedMessages) {
                const allMessages = JSON.parse(storedMessages);
                const combined = composeNotifications(user.role as any, [], [], allMessages);
                setNotifications(Array.isArray(combined) ? combined : []);
                setUnreadCount(computeNotificationCount(combined, user.role));
              } else {
                setNotifications([]);
                setUnreadCount(0);
              }
            }
          } catch (err) {
            console.error('Error in fallback notification loading:', err);
            // Final fallback to localStorage only
            try {
              const storedMessages = localStorage.getItem('notifications_messages');
              if (storedMessages) {
                const allMessages = JSON.parse(storedMessages);
                const combined = composeNotifications(user.role as any, [], [], allMessages);
                setNotifications(Array.isArray(combined) ? combined : []);
                setUnreadCount(computeNotificationCount(combined, user.role));
              } else {
                setNotifications([]);
                setUnreadCount(0);
              }
            } catch (finalErr) {
              console.error('Error loading notifications from localStorage:', finalErr);
              setNotifications([]);
              setUnreadCount(0);
            }
          }
        }
      };
      load();
 
      // Poll for new notifications every 2 seconds
      const interval = setInterval(() => {
        (async () => {
          try {
            const token = getToken();
            
            // Fetch inbox messages first (most important)
            let inboxMapped: any[] = [];
            try {
              const inboxRes = await fetch('/dev-api/api/messages/inbox', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              const inboxData = await inboxRes.json();
              if (inboxData?.code === 200 && Array.isArray(inboxData.result?.messages)) {
                const raw = inboxData.result.messages.map((m: any) => {
                  if (user.role === 'admin') {
                    return {
                      id: `msg-${m.id}`,
                      messageId: m.id,
                      sender: m.sender_id,
                      senderId: m.sender_id,
                      senderRole: 'user',
                      role: 'user',
                      subject: m.subject || '',
                      text: m.content,
                      message: m.content,
                      timestamp: new Date(m.created_at || Date.now()).getTime(),
                      read: !!m.is_read,
                    };
                  } else {
                    return {
                      id: `msg-${m.id}`,
                      messageId: m.id,
                      sender: m.sender_id,
                      senderId: m.sender_id,
                      senderRole: 'admin',
                      role: 'admin',
                      subject: m.subject || '',
                      text: m.content,
                      message: m.content,
                      timestamp: new Date(m.created_at || Date.now()).getTime(),
                      read: !!m.is_read,
                    };
                  }
                });
                const viewerKey = getViewerKey(user);
                inboxMapped = applyPersistentRead(raw, viewerKey);
              }
            } catch (err) {
              // Continue with other sources
            }

            // Fetch backend notifications (optional)
            let mappedServer: any[] = [];
            try {
              const res = await apiGetNotifications(false);
              if (res?.code === 200 && Array.isArray(res.result)) {
                mappedServer = res.result.map((n: any) => ({
                  id: `srv-${n.id}`,
                  notificationId: n.id,
                  sender: 'admin',
                  senderRole: 'admin',
                  role: 'admin',
                  subject: n.title || '',
                  text: n.message,
                  message: n.message,
                  timestamp: new Date(n.created_at || n.createdAt || Date.now()).getTime(),
                  read: !!n.is_read,
                }));
                const viewerKey = getViewerKey(user);
                mappedServer = applyPersistentRead(mappedServer, viewerKey);
              }
            } catch (err) {
              // Continue with inbox messages only
            }

            // Merge with local messages
            let local: any[] = [];
            try {
              const storedMessages = localStorage.getItem('notifications_messages');
              local = storedMessages ? JSON.parse(storedMessages) : [];
              if (!Array.isArray(local)) local = [];
            } catch {
              local = [];
            }

            const combined = composeNotifications(user.role as any, mappedServer, inboxMapped, local);
            setNotifications(Array.isArray(combined) ? combined : []);
            setUnreadCount(computeNotificationCount(combined, user.role));
          } catch (e) {
            // Silently ignore polling errors to avoid console spam
          }
        })();
      }, 2000);
 
      return () => clearInterval(interval);
    }
  }, [user]);
 
  const handleLogin = (userData: User) => {
    setUser(userData);
  };
 
  const handleLogout = () => {
    setUser(null);
    setActiveFeature(null);
    setShowProfile(false);
  };

  const handleNotificationBellClick = () => {
    setNotificationBellClicked(true);
    setUnreadCount(0);
    setTimeout(() => setNotificationBellClicked(false), 50);
  };
 
  const handleFeatureClick = (feature: FeatureType) => {
    if (feature === 'contact-admin') {
      setShowContactAdminModal(true);
      return;
    }
    if (feature === 'message') {
      setShowBroadcastModal(true);
      return;
    }
    setActiveFeature(feature);
    setShowProfile(false);
  };
 
  const handleProfileClick = () => {
    setShowProfile(true);
    setActiveFeature(null);
  };

  const handleMarkAsRead = async (item: any) => {
    if (!item || !item.id) return;

    const viewerKey = getViewerKey(user);

    // Local state update for immediate UI feedback
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );

    // Update persistent read storage (scoped per-user)
    addReadId(item.notificationId, item.messageId, viewerKey);

    // Mark server-side read only for inbox messages
    if (item.messageId) {
      const token = getToken();
      fetch(`/dev-api/api/messages/mark-read/${item.messageId}`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch((err) => {
        console.error('Failed to mark message as read:', err);
      });
    }
  };
 
  const handleContactAdminSubmit = async (data: { subject: string; message: string }) => {
    setIsSubmitting(true);
    try {
      // Create message object
      const now = new Date();
      const newMessage = {
        id: Date.now().toString(),
        sender: user?.name || 'User',
        senderRole: user?.role,
        role: user?.role,
        subject: data.subject || '',
        text: data.message || '',
        message: data.message || '',
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString('en-US'),
        timestamp: now.getTime(),
        read: false,
      };
 
      // Store in localStorage
      const storedMessages = localStorage.getItem('notifications_messages');
      const allMessages = storedMessages ? JSON.parse(storedMessages) : [];
      allMessages.unshift(newMessage); // Add at beginning for newest first
      localStorage.setItem('notifications_messages', JSON.stringify(allMessages));
 
      // Update notifications state
      const filteredNotifications = allMessages.filter((m: any) => {
        if (user?.role === 'admin') return m.role === 'user';
        return m.role === 'admin';
      });
      setNotifications(filteredNotifications);
 
      // Call API to create support ticket if user (via proxy helper)
      if (user?.role === 'user') {
        try {
          await createSupportTicket({ subject: data.subject || 'No Subject', message: data.message });
        } catch (apiError) {
          console.error('API error:', apiError);
        }
      }
 
      setShowContactAdminModal(false);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
 
  const handleSendToAll = async (message: string) => {
    try {
      // Create broadcast message object
      const now = new Date();
      const broadcastMessage = {
        id: Date.now().toString(),
        sender: user?.name || 'Admin',
        senderRole: 'admin',
        role: 'admin',
        subject: 'Broadcast Message',
        text: message,
        message: message,
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString('en-US'),
        timestamp: now.getTime(),
        read: false,
      };
 
      // Store in localStorage
      const storedMessages = localStorage.getItem('notifications_messages');
      const allMessages = storedMessages ? JSON.parse(storedMessages) : [];
      allMessages.unshift(broadcastMessage); // Add at beginning for newest first
      localStorage.setItem('notifications_messages', JSON.stringify(allMessages));
 
      // Update notifications state for all users (will be filtered based on user role)
      // This is a simulation - in production, this would be sent to the backend
      // The backend would then notify all connected user sessions
      const filteredNotifications = allMessages.filter((m: any) => {
        if (user?.role === 'admin') return m.role === 'user';
        return m.role === 'admin';
      });
      setNotifications(filteredNotifications);
 
      // TODO: Call API to broadcast message to all users
      console.log('Broadcasting to all users:', message);
      alert('Message sent to all users');
    } catch (error) {
      console.error('Error broadcasting:', error);
      alert('Failed to broadcast message');
    }
  };
 
  const handleClosePopup = () => {
    setActiveFeature(null);
    setShowProfile(false);
  };
 
  const handleSaveToHistory = (query: string, answer: string, source: any) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      query,
      answer,
      timestamp: new Date(),
      source: {
        document: source.document,
        page: source.page,
      },
    };
    setHistory((prev) => [newItem, ...prev]);
  };
 
  const getPopupTitle = (): string => {
    if (showProfile) return 'Profile';
    switch (activeFeature) {
      case 'chat':
        return 'Ask HR Bot';
      case 'documents':
        return 'Document Viewer';
      case 'history':
        return 'Conversation History';
      case 'notifications':
        return 'Messages';
      case 'admin':
        return 'Admin Dashboard';
      default:
        return '';
    }
  };
 
  const getPopupContent = () => {
    if (showProfile && user) {
      return <ProfilePopup user={user} onLogout={handleLogout} />;
    }
 
    switch (activeFeature) {
      case 'chat':
        return <ChatInterface onSaveToHistory={handleSaveToHistory} />;
      case 'history':
        return <HistoryPage history={history} />;
      case 'notifications':
        return <Messenger user={user} onUnreadCountChange={setUnreadCount} onNotificationsChange={setNotifications} />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return null;
    }
  };
 
  if (!user) {
    return (
      <ToastProvider>
        <LoginPage onLogin={handleLogin} />
      </ToastProvider>

    );
  }
 
  return (
    <ToastProvider>
      <HomePage
        user={user}
        onFeatureClick={handleFeatureClick}
        onProfileClick={handleProfileClick}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        unreadCount={unreadCount}
        onSendToAll={handleSendToAll}
        onSaveToHistory={handleSaveToHistory}
        history={history}
        onNotificationBellClick={handleNotificationBellClick}
      />
 
      <ContactAdminPopup
        isOpen={showContactAdminModal}
        onClose={() => setShowContactAdminModal(false)}
        onSend={handleContactAdminSubmit}
        isSubmitting={isSubmitting}
      />

      <BroadcastModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
      />
 
      <Popup
        isOpen={activeFeature !== null || showProfile}
        onClose={handleClosePopup}
        title={getPopupTitle()}
        maxWidth={activeFeature === 'admin' ? 'max-w-6xl' : 'max-w-4xl'}
      >
        {getPopupContent()}
      </Popup>
    </ToastProvider>
  );
}
 
function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}
 
export default App;
 
 
