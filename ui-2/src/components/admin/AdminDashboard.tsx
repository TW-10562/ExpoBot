import { useState, useEffect } from 'react';
import {
  FileText,
  Users,
  Activity,
  MessageSquare,
  BarChart3,
} from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { getToken } from '../../api/auth';
import AnalyticsDashboard from './AnalyticsDashboard';
import ChatInterface from '../chat/ChatInterface';
import UserManagement from './UserManagement';
import ContactUsersPanel from './ContactUsersPanel';
import DocumentUpload from './DocumentUpload';
import DocumentTable from './DocumentTable';
import ActivityLogComponent from './ActivityLog';
import DeleteMessagesModal from './DeleteMessagesModal';

type Tab = 'documents' | 'analytics' | 'users' | 'activity' | 'chat' | 'contact' | 'messages';

interface AdminDashboardProps {
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
  initialTab?: Tab;
}

interface DocumentHistory {
  id: number;
  filename: string;
  size: number;
  mime_type: string;
  created_at: string;
  create_by: string;
  storage_key: string;
}

interface UserItem {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  lastActive: Date;
  queries: number;
}

interface ActivityLog {
  id: string;
  user: string;
  action: string;
  detail: string;
  timestamp: Date;
}

export default function AdminDashboard({ activeTab: controlledTab, onTabChange, initialTab }: AdminDashboardProps) {
  const { t } = useLang();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>(controlledTab || initialTab || 'analytics');
  const [documentHistory, setDocumentHistory] = useState<DocumentHistory[]>([]);
  const [mockUsers, setMockUsers] = useState<UserItem[]>([]);
  const [mockActivity, setMockActivity] = useState<ActivityLog[]>([]);
  const [showDeleteMessages, setShowDeleteMessages] = useState(false);
  const [triggerUpload, setTriggerUpload] = useState(false);

  // Sync internal tab with controlled prop
  useEffect(() => {
    if (controlledTab && controlledTab !== activeTab) {
      setActiveTab(controlledTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledTab]);

  // Load document history
  useEffect(() => {
    const loadDocumentHistory = async () => {
      try {
        console.log('📂 [AdminDashboard] Fetching document history from database...');
        const token = getToken();
        const response = await fetch('/dev-api/api/files?pageNum=1&pageSize=100', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        const data = await response.json();

        console.log('✅ [AdminDashboard] Document history loaded:', {
          total: data.result?.rows?.length || data.data?.length || 0,
          response: data
        });

        const files = data.result?.rows || data.data || data.rows || [];
        if (Array.isArray(files)) {
          setDocumentHistory(files);
        }
      } catch (error) {
        console.error('❌ [AdminDashboard] Error fetching document history:', error);
      }
    };

    loadDocumentHistory();
  }, []);

  // Load users and activity
  useEffect(() => {
    console.log('📊 [AdminDashboard] Setting up users and activity...');

    const users: UserItem[] = [
      {
        id: '1',
        name: 'Admin',
        employeeId: 'admin',
        department: 'Administration',
        lastActive: new Date(),
        queries: documentHistory.length + 5,
      },
    ];

    const uploaders = new Set<string>();
    documentHistory.forEach(doc => {
      const uploader = doc.create_by || 'admin';
      if (!uploaders.has(uploader) && uploader !== 'admin') {
        uploaders.add(uploader);
        users.push({
          id: uploader,
          name: uploader,
          employeeId: uploader,
          department: 'General',
          lastActive: new Date(doc.created_at),
          queries: 1,
        });
      }
    });

    setMockUsers(users);

    const activities: ActivityLog[] = documentHistory.slice(0, 10).map((doc, index) => ({
      id: String(index + 1),
      user: doc.create_by || t('activity.admin'),
      action: t('activity.documentUploaded'),
      detail: doc.filename,
      timestamp: new Date(doc.created_at),
    }));

    activities.unshift({
      id: 'chat-1',
      user: t('activity.admin'),
      action: t('activity.chatQuery'),
      detail: t('activity.chatDetail'),
      timestamp: new Date(),
    });

    setMockActivity(activities);
  }, [documentHistory, t]);

  const handleDocumentRefresh = async () => {
    try {
      const token = getToken();
      const refreshResponse = await fetch('/dev-api/api/files?pageNum=1&pageSize=100', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const refreshData = await refreshResponse.json();
      const files = refreshData.result?.rows || refreshData.data || refreshData.rows || [];
      if (Array.isArray(files)) {
        setDocumentHistory(files);
      }
    } catch (refreshError) {
      console.error('❌ [AdminDashboard] Error refreshing document list:', refreshError);
    }
  };

  const tabs = [
    { id: 'documents' as Tab, label: t('admin.documents'), icon: FileText },
    { id: 'analytics' as Tab, label: t('admin.analytics'), icon: BarChart3 },
    { id: 'users' as Tab, label: t('admin.users'), icon: Users },
    { id: 'activity' as Tab, label: t('admin.activity'), icon: Activity },
    { id: 'chat' as Tab, label: t('admin.chat'), icon: MessageSquare },
    { id: 'contact' as Tab, label: t('admin.contact'), icon: Users },
    { id: 'messages' as Tab, label: t('admin.messages'), icon: FileText },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Hide internal tab bar when controlled by external sidebar */}
      {!controlledTab && (
        <div className="flex border-b border-[#E8E8E8] dark:border-dark-border bg-white dark:bg-dark-bg-primary transition-colors overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                onTabChange?.(tab.id);
              }}
              className={`flex items-center justify-center gap-2 px-6 py-4 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#F0F4FF] dark:bg-dark-surface border-b-2 border-[#1d2089] dark:border-[#60a5fa] text-[#1d2089] dark:text-[#60a5fa]'
                  : 'text-[#6E7680] dark:text-dark-text-muted hover:bg-[#F6F6F6] dark:hover:bg-dark-border hover:text-[#232333] dark:hover:text-white'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      <div key={activeTab} className="flex-1 overflow-y-auto p-6 mac-tab-animate bg-[#F6F6F6] dark:bg-[#0f0f23] transition-colors">
        {activeTab === 'documents' && (
          <>
            <DocumentUpload
              documentHistory={documentHistory}
              onUploadComplete={setDocumentHistory}
              triggerFileInput={triggerUpload}
              onTriggerReset={() => setTriggerUpload(false)}
            />
            <DocumentTable
              documentHistory={documentHistory}
              onDocumentDeleted={handleDocumentRefresh}
              onUploadClick={() => setTriggerUpload(true)}
            />
          </>
        )}

        {activeTab === 'analytics' && <AnalyticsDashboard />}

        {activeTab === 'chat' && (
          <div className="bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-2xl overflow-hidden animate-section-in flex flex-col h-full shadow-sm transition-colors">
            <div className="p-4 border-b border-[#E8E8E8] dark:border-dark-border bg-[#F6F6F6] dark:bg-dark-bg-primary transition-colors">
              <h3 className="text-xl font-semibold text-[#232333] dark:text-white transition-colors">
                {t('chat.title')}
              </h3>
            </div>
            <div className="flex-1 min-h-0">
              <ChatInterface onSaveToHistory={() => {}} />
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <>
            <ContactUsersPanel onOpenDeleteMessages={() => setShowDeleteMessages(true)} />
          </>
        )}

        {activeTab === 'users' && <UserManagement />}

        {activeTab === 'activity' && (
          <ActivityLogComponent activities={mockActivity} />
        )}

        {activeTab === 'messages' && (
          <div className="space-y-6">
            <button
              onClick={() => setShowDeleteMessages(true)}
              className="w-full px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors"
            >
              {t('messages.deleteButton')}
            </button>
          </div>
        )}
      </div>

      {/* Delete Messages Modal */}
      <DeleteMessagesModal
        isOpen={showDeleteMessages}
        onClose={() => setShowDeleteMessages(false)}
        onSuccess={handleDocumentRefresh}
      />
    </div>
  );
}
