import { useState } from 'react';
import LoginPage from './components/LoginPage';
import HomePage from './components/HomePage';
import Popup from './components/Popup';
import ChatInterface from './components/ChatInterface';
import HistoryPage from './components/HistoryPage';
import ProfilePopup from './components/ProfilePopup';
import AdminDashboard from './components/AdminDashboard';
import NotificationPopup from './components/NotificationPopup';
import DocumentViewer from './components/DocumentViewer';
import SettingsPage from './components/SettingsPage';
import { User, FeatureType, HistoryItem, Notification } from './types';
import { MOCK_HISTORY, MOCK_NOTIFICATIONS } from './constants';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeFeature, setActiveFeature] = useState<FeatureType | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(MOCK_HISTORY);
  const [notifications, setNotifications] =
    useState<Notification[]>(MOCK_NOTIFICATIONS);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setActiveFeature(null);
    setShowProfile(false);
  };

  const handleFeatureClick = (feature: FeatureType) => {
    setActiveFeature(feature);
    setShowProfile(false);
  };

  const handleProfileClick = () => {
    setShowProfile(true);
    setActiveFeature(null);
  };

  const handleNotificationClick = () => {
    setActiveFeature('notifications');
    setShowProfile(false);
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

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
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
        return 'Notifications';
      case 'settings':
        return 'Settings';
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
      case 'documents':
        return <DocumentViewer />;
      case 'history':
        return <HistoryPage history={history} />;
      case 'notifications':
        return (
          <NotificationPopup
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
          />
        );
      case 'settings':
        return <SettingsPage />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return null;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <>
      <HomePage
        user={user}
        onFeatureClick={handleFeatureClick}
        onProfileClick={handleProfileClick}
        onNotificationClick={handleNotificationClick}
        onSettingsClick={() => setActiveFeature('settings')} // ← ADD THIS
        unreadCount={unreadCount}
      />

      <Popup
        isOpen={activeFeature !== null || showProfile}
        onClose={handleClosePopup}
        title={getPopupTitle()}
        maxWidth={activeFeature === 'admin' ? 'max-w-6xl' : 'max-w-4xl'}
      >
        {getPopupContent()}
      </Popup>
    </>
  );
}

export default App;
