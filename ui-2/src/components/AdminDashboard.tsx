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
  const [showContactDeleteMessages, setShowContactDeleteMessages] = useState(false);
  const [showDeleteMessages, setShowDeleteMessages] = useState(false);

  // Sync internal tab with controlled prop
  useEffect(() => {
    if (controlledTab && controlledTab !== activeTab) {
      setActiveTab(controlledTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledTab]);

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

  // Load users and activity - use document history + static users
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
      user: doc.create_by
  ? t(`activity.roles.${doc.create_by}`)
  : t('activity.admin'),

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
  }, [documentHistory]);

  const handleDeleteFile = async () => {
    // Refresh document list
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
      console.error('❌ [AdminDashboard] Error refreshing document list after delete:', refreshError);
    }
  };

  const openContactDeleteMessages = () => {
    setShowDeleteMessages(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Hide internal tab bar when controlled by external sidebar */}
      {!controlledTab && (
        <div className="flex border-b border-[#E8E8E8] dark:border-dark-border bg-white dark:bg-dark-bg-primary transition-colors">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                onTabChange?.(tab.id);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 transition-all ${
                activeTab === tab.id
                  ? 'bg-[#F0F4FF] dark:bg-dark-surface border-b-2 border-[#2563eb] dark:border-[#60a5fa] text-[#2563eb] dark:text-[#60a5fa]'
                  : 'text-[#6E7680] dark:text-dark-text-muted hover:bg-[#F6F6F6] dark:hover:bg-dark-border hover:text-[#232333] dark:hover:text-white'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      )}

<div
  key={activeTab}
  className={`flex-1 mac-tab-animate bg-[#F6F6F6] dark:bg-dark-gradient transition-colors ${
    activeTab === 'chat'
      ? 'overflow-hidden min-h-0 p-0'
      : 'overflow-y-auto p-6'
  }`}
>
        {/* Delete Confirmation Modal */}
        {pendingDelete && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#232333] dark:text-white transition-colors">
  {t('documentTable.deleteTitle')}
</h3>
<p className="text-sm text-[#6E7680] dark:text-dark-text-muted transition-colors">
  {t('documentTable.deleteWarning')}
</p>
                </div>
              </div>
              <div className="bg-[#F6F6F6] dark:bg-dark-surface-alt rounded-xl p-4 transition-colors">
                <p className="text-xs text-[#6E7680] dark:text-dark-text-muted mb-1 transition-colors">File Name</p>
                <p className="text-sm font-medium text-[#232333] dark:text-dark-text break-all transition-colors">{pendingDelete.filename}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setPendingDelete(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#F6F6F6] dark:bg-dark-surface-alt hover:bg-[#E8E8E8] dark:hover:bg-dark-surface text-[#232333] dark:text-dark-text font-medium transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => {
                    handleDeleteFile(pendingDelete.id, pendingDelete.filename);
                    setPendingDelete(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Duplicate Warning Modal */}
        {showDuplicateWarning && duplicateFile && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#232333] dark:text-white transition-colors">Duplicate Document</h3>
                  <p className="text-sm text-[#6E7680] dark:text-dark-text-muted transition-colors">This file already exists</p>
                </div>
              </div>

              <div className="space-y-3 bg-[#F6F6F6] dark:bg-dark-border rounded-xl p-4 transition-colors">
                <div>
                  <p className="text-xs text-[#6E7680] dark:text-dark-text-muted transition-colors">File Name</p>
                  <p className="text-sm font-medium text-[#232333] dark:text-dark-text transition-colors">{duplicateFile.filename}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6E7680] dark:text-dark-text-muted transition-colors">Uploaded on</p>
                  <p className="text-sm font-medium text-[#232333] dark:text-dark-text transition-colors">
                    {new Date(duplicateFile.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#6E7680] dark:text-dark-text-muted transition-colors">Uploaded by</p>
                  <p className="text-sm font-medium text-[#232333] dark:text-dark-text transition-colors">{duplicateFile.create_by || 'System'}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDuplicateWarning(false);
                    setDuplicateFile(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#F6F6F6] dark:bg-dark-surface-alt hover:bg-[#E8E8E8] dark:hover:bg-dark-surface text-[#232333] dark:text-dark-text font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleDeleteFile(duplicateFile.id, duplicateFile.filename);
                    setShowDuplicateWarning(false);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete & Replace
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-semibold text-[#232333] dark:text-white transition-colors">{t('documentTable.title')}</h3>
              <div className="flex items-center gap-3 flex-1 max-w-md">
                {/* Simple Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E7680] dark:text-dark-text-muted transition-colors" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('documentTable.searchPlaceholder')}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-xl text-[#232333] dark:text-dark-text placeholder-[#9CA3AF] dark:placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-[#2563eb] dark:focus:ring-dark-accent-blue transition-colors"
                  />
                </div>
                <label className="flex items-center gap-2 px-4 py-2.5 bg-[#2563eb] hover:bg-[#161870] text-white rounded-xl transition-colors cursor-pointer whitespace-nowrap font-medium">
                  <Upload className="w-5 h-5" />
                  <span>{t('documentTable.upload')}</span>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.xlsx,.csv"
                  />
                </label>
              </div>
            </div>

            {uploadingFiles.length > 0 && (
              <div className="bg-[#F0F4FF] dark:bg-dark-surface-alt border border-[#2563eb]/20 dark:border-dark-border rounded-2xl p-6 space-y-6 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-[#232333] dark:text-white transition-colors mb-1">{t('documentTable.filesSelected', {count: uploadingFiles.length,})}</h4>
                    <p className="text-sm text-[#6E7680] dark:text-dark-text-muted transition-colors">{t('documentTable.totalSize', {size: (uploadingFiles.reduce((acc, f) => acc + f.size, 0) /1024 /1024).toFixed(2),})}</p>
                  </div>
                  <button
                    onClick={resetUpload}
                    className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-[#6E7680] dark:text-dark-text-muted transition-colors" />
                  </button>
                </div>

                {/* Review list with per-file categories and selection */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {uploadingFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-white dark:bg-dark-surface rounded-xl px-3 py-2 gap-3 border border-[#E8E8E8] dark:border-dark-border transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-[#2563eb] dark:accent-dark-accent-blue"
                          checked={selectedToRemove.has(file.name)}
                          onChange={(e) => {
                            setSelectedToRemove(prev => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(file.name); else next.delete(file.name);
                              return next;
                            });
                          }}
                          disabled={uploadProgress[file.name] !== 'pending'}
                        />
                        <FileText className="w-4 h-4 text-[#2563eb] flex-shrink-0" />
                        <span className="text-sm text-[#232333] dark:text-dark-text truncate transition-colors" title={file.name}>{file.name}</span>
                        <span className="text-xs text-[#6E7680] dark:text-dark-text-muted transition-colors">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        {uploadProgress[file.name] === 'success' && (
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                        )}
                        {uploadProgress[file.name] === 'uploading' && (
                          <Clock className="w-4 h-4 text-yellow-400 animate-pulse flex-shrink-0" />
                        )}
                      </div>
                      {/* Per-file category selector */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400 dark:text-dark-text-muted transition-colors">
  {t('documentTable.categoryLabel')}
</label>

                        <select
                          value={fileCategories[file.name] || 'company_policy'}
                          onChange={(e) => setFileCategories(prev => ({ ...prev, [file.name]: e.target.value }))}
                          disabled={uploadProgress[file.name] !== 'pending'}
                          className="bg-[#F6F6F6] dark:bg-dark-surface-alt border border-[#E8E8E8] dark:border-dark-border text-[#232333] dark:text-dark-text text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#2563eb] dark:focus:ring-dark-accent-blue transition-colors"
                        >
                          <option value="company_policy">
  {t('documentTable.category.companyPolicy')}
</option>
<option value="internal_guide">
  {t('documentTable.category.internalGuide')}
</option>
<option value="procedure">
  {t('documentTable.category.procedure')}
</option>
<option value="faq">
  {t('documentTable.category.faq')}
</option>

                        </select>
                        {uploadProgress[file.name] === 'pending' && (
                          <button
                            onClick={() => removeFile(file.name)}
                            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>


                {/* Bulk actions in review */}
                 {reviewMode && (
                  <div className="flex items-center justify-between">
                    <button
  onClick={removeSelectedFiles}
  disabled={selectedToRemove.size === 0}
  className="px-3 py-2 rounded-xl bg-[#F6F6F6] dark:bg-dark-surface-alt hover:bg-[#E8E8E8] dark:hover:bg-dark-surface text-[#232333] dark:text-dark-text disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
>
  {t('documentTable.removeSelected')}
</button>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>
  {t('documentTable.selectedCount', { count: selectedToRemove.size })}
</span>
                    </div>
                  </div>
                )}
                {/* Global category picker hidden during review (kept for defaulting new selections) */}
                {/* Global category picker hidden during review (kept for defaulting new selections) */}
                {!reviewMode && (
                  <div>
                    <label className="block text-sm font-medium text-[#232333] dark:text-dark-text mb-3 transition-colors">
  {t('documentTable.defaultCategory')}
</label>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'company_policy', label: t('documentTable.category.companyPolicy') },
  { value: 'internal_guide', label: t('documentTable.category.internalGuide') },
  { value: 'procedure', label: t('documentTable.category.procedure') },
  { value: 'faq', label: t('documentTable.category.faq') },
                      ].map((cat) => (
                        <button
                          key={cat.value}
                          onClick={() => setUploadCategory(cat.value)}
                          className={`px-4 py-2 rounded-xl font-medium transition-all ${
                            uploadCategory === cat.value
                              ? 'bg-[#2563eb] text-white shadow-lg'
                              : 'bg-white dark:bg-dark-surface text-[#6E7680] dark:text-dark-text-muted hover:bg-[#F6F6F6] dark:hover:bg-dark-border border border-[#E8E8E8] dark:border-dark-border'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h5 className="text-sm font-semibold text-[#232333] dark:text-white transition-colors">
  {t('documentTable.pipelineTitle')}
</h5>

                  <div className="space-y-3">
                    {pipelineSteps.map((step) => (
                      <div key={step.step}>
                        <div className="flex items-center gap-3 mb-2">
                          {getStepIcon(step.step, step.status)}
                          <span className="text-sm font-medium text-[#232333] dark:text-dark-text transition-colors">
                              {t(step.labelKey)}
                          </span>

                          {step.status === 'completed' && (
                            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
  {t('documentTable.pipelineStatusDone')}
</span>

                          )}
                          {step.status === 'in-progress' && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">
  {t('documentTable.pipelineStatusProcessing')}
</span>

                          )}
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              step.status === 'completed'
                                ? 'w-full bg-green-500'
                                : step.status === 'in-progress'
                                ? 'w-2/3 bg-blue-500'
                                : 'w-0 bg-slate-500'
                            }`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>


                {/* Continue button for review step; starts upload */}
                {reviewMode ? (
                  <button
                    onClick={handleStartUpload}
                    className="w-full px-6 py-3 bg-[#2563eb] hover:bg-[#161870] text-white font-semibold rounded-xl transition-all"
                  >
                    {t('documentTable.nextContinue')}
                  </button>
                ) : (
                  <button
                    onClick={handleStartUpload}
                    disabled={pipelineSteps[0].status !== 'pending'}
                    className="w-full px-6 py-3 bg-[#2563eb] hover:bg-[#161870] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
                  >
                    {pipelineSteps[0].status === 'pending' ? '🚀 Start Upload Pipeline' : t('documentTable.pipeline.processing')}
                  </button>
                )}
              </div>
            )}

            <div className="bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-2xl overflow-hidden shadow-sm transition-colors">
              {/* Bulk actions above table */}
              <div className="flex items-center justify-between p-3 border-b border-[#E8E8E8] dark:border-dark-border bg-[#F6F6F6] dark:bg-dark-bg-primary transition-colors">
                <div className="text-sm text-[#6E7680] dark:text-dark-text-muted transition-colors">
                  {t('documentTable.manage')}
                </div>
                <button
                  onClick={() => {
                    const selected = Array.from(selectedDocIds);
                    if (selected.length === 0) return;
                    const docs = documentHistory.filter(d => selected.includes(d.id));
                    setPendingBulkDelete(docs);
                  }}
                  disabled={selectedDocIds.size === 0}
                  className="px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                >
                  {t('documentTable.deleteSelected')} ({selectedDocIds.size})
                </button>
              </div>
              <table className="w-full">
                <thead className="bg-[#F6F6F6] dark:bg-dark-bg-primary border-b border-[#E8E8E8] dark:border-dark-border transition-colors">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      {(() => {
                        const filteredDocs = searchQuery.trim()
                          ? documentHistory.filter(doc => doc.filename.toLowerCase().includes(searchQuery.toLowerCase()))
                          : documentHistory;
                        const allSelected = filteredDocs.length > 0 && filteredDocs.every(doc => selectedDocIds.has(doc.id));
                        return (
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-[#2563eb]"
                            checked={allSelected}
                            onChange={(e) => {
                              const next = new Set(selectedDocIds);
                              if (e.target.checked) {
                                filteredDocs.forEach(d => next.add(d.id));
                              } else {
                                filteredDocs.forEach(d => next.delete(d.id));
                              }
                              setSelectedDocIds(next);
                            }}
                          />
                        );
                      })()}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">
        {t('documentTable.documentName')}
      </th>

      <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">
        {t('documentTable.size')}
      </th>

      <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">
        {t('documentTable.uploadedBy')}
      </th>

      <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">
        {t('documentTable.uploadDate')}
      </th>

      <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">
        {t('documentTable.status')}
      </th>

      <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">
        {t('documentTable.action')}
      </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredDocs = searchQuery.trim() 
                      ? documentHistory.filter(doc => doc.filename.toLowerCase().includes(searchQuery.toLowerCase()))
                      : documentHistory;
                    
                    return filteredDocs.length > 0 ? (
                      filteredDocs.map((doc) => (
                      <tr key={doc.id} className="border-b border-[#E8E8E8] dark:border-dark-border hover:bg-[#F6F6F6] dark:hover:bg-dark-border transition-colors">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-[#2563eb]"
                            checked={selectedDocIds.has(doc.id)}
                            onChange={(e) => {
                              setSelectedDocIds(prev => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(doc.id); else next.delete(doc.id);
                                return next;
                              });
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 text-[#232333] dark:text-dark-text font-medium transition-colors">{doc.filename}</td>
                        <td className="px-4 py-3 text-[#6E7680] dark:text-dark-text-muted transition-colors">
                          {(doc.size / 1024 / 1024).toFixed(2)} MB
                        </td>
                        <td className="px-4 py-3 text-[#6E7680] dark:text-dark-text-muted transition-colors">{doc.create_by || 'System'}</td>
                        <td className="px-4 py-3 text-[#6E7680] dark:text-dark-text-muted transition-colors">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            {t('documentTable.active')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setPendingDelete({ id: doc.id, filename: doc.filename })}
                            disabled={deletingFileId === doc.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {deletingFileId === doc.id ? '...' : t('documentTable.delete')}
                          </button>
                        </td>
                      </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-[#6E7680] dark:text-dark-text-muted transition-colors">
                          {t('documentTable.noDocuments')}
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard />
        )}

        {activeTab === 'chat' && (
          <div className="bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-2xl overflow-hidden animate-section-in flex flex-col h-full shadow-sm transition-colors">
            <div className="p-4 border-b border-[#E8E8E8] dark:border-dark-border bg-[#F6F6F6] dark:bg-dark-bg-primary transition-colors">
              <h3 className="text-xl font-semibold text-[#232333] dark:text-white transition-colors">
  {t('chat.title')}
</h3>
            </div>
            {/* Make chat occupy full vertical height with proper scrolling */}
            <div className="flex-1 min-h-0">
              <ChatInterface onSaveToHistory={() => {}} />
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="space-y-6">
            <ContactUsersPanel onOpenDeleteMessages={openContactDeleteMessages} />

            {showContactDeleteMessages && (
            <div ref={contactDeleteRef} className="mt-6">
              <div className="bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-2xl overflow-hidden shadow-sm transition-colors">
                {/* Header with close button */}
                <div className="p-5 border-b border-[#E8E8E8] dark:border-dark-border bg-red-50 dark:bg-red-950/30 flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-500 rounded-xl">
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#232333] dark:text-white transition-colors">
                        {t('messages.deleteTitle')}
                      </h3>
                      <p className="text-sm text-[#6E7680] dark:text-dark-text-muted transition-colors">
                        {t('messages.permanentDeleteTitle')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowContactDeleteMessages(false)}
                    className="p-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-950/50 text-[#6E7680] dark:text-dark-text-muted hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-5">
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 mb-5 transition-colors">
                    <p className="text-sm text-amber-700 dark:text-amber-300 transition-colors">
                      <span className="font-semibold">{t('common.warning')}</span>{' '}{t('messages.deleteWarning')}
                    </p>
                  </div>
                    
                  <div className="space-y-3 mb-5">
                    <label className="flex items-center gap-4 p-4 bg-[#F6F6F6] dark:bg-dark-surface-alt border border-[#E8E8E8] dark:border-dark-border rounded-xl cursor-pointer hover:bg-[#E8E8E8] dark:hover:bg-dark-surface transition-colors">
                      <input
                        type="checkbox"
                        checked={deleteUserMessages}
                        onChange={(e) => setDeleteUserMessages(e.target.checked)}
                        className="w-5 h-5 accent-[#2563eb] dark:accent-dark-accent-blue rounded"
                      />
                      <div className="flex-1">
                        <span className="text-[#232333] dark:text-dark-text font-medium transition-colors">
                          {t('messages.usersLabel')}
                        </span>
                        <p className="text-xs text-[#6E7680] dark:text-dark-text-muted mt-1 transition-colors">
                          {t('messages.usersHelp')}
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-4 p-4 bg-[#F6F6F6] dark:bg-dark-surface-alt border border-[#E8E8E8] dark:border-dark-border rounded-xl cursor-pointer hover:bg-[#E8E8E8] dark:hover:bg-dark-surface transition-colors">
                      <input
                        type="checkbox"
                        checked={deleteAdminMessages}
                        onChange={(e) => setDeleteAdminMessages(e.target.checked)}
                        className="w-5 h-5 accent-[#2563eb] dark:accent-dark-accent-blue rounded"
                      />
                      <div className="flex-1">
                        <span className="text-[#232333] dark:text-dark-text font-medium transition-colors">
                          {t('messages.adminsLabel')}
                        </span>
                        <p className="text-xs text-[#6E7680] dark:text-dark-text-muted mt-1 transition-colors">
                          {t('messages.adminsHelp')}
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowContactDeleteMessages(false)}
                      className="flex-1 px-6 py-3 bg-[#F6F6F6] dark:bg-dark-surface-alt hover:bg-[#E8E8E8] dark:hover:bg-dark-surface text-[#232333] dark:text-dark-text font-medium rounded-xl transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={() => {
                        if (!deleteUserMessages && !deleteAdminMessages) {
                          toast.error('Please select at least one option');
                          return;
                        }
                        setShowDeleteConfirm(true);
                        setConfirmationText('');
                        setDeleteSuccess(false);
                      }}
                      disabled={!deleteUserMessages && !deleteAdminMessages}
                      className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-[#E8E8E8] dark:disabled:bg-dark-border disabled:text-[#9CA3AF] dark:disabled:text-dark-text-muted disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-5 h-5" />
                      {t('messages.deleteButton')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        )}

       {activeTab === 'users' && <UserManagement />}

        {activeTab === 'activity' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-[#232333] dark:text-white transition-colors">{t('activity.title')}</h3>

            <div className="space-y-3">
              {mockActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-2xl p-4 hover:bg-[#F6F6F6] dark:hover:bg-dark-border transition-colors shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#F0F4FF] dark:bg-dark-surface-alt rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
                      <Activity className="w-5 h-5 text-[#2563eb] dark:text-dark-accent-blue transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[#232333] dark:text-dark-text font-medium transition-colors">{activity.user}</span>
                        <span className="text-[#9CA3AF]">•</span>
                        <span className="text-[#6E7680] dark:text-dark-text-muted transition-colors">{activity.action}</span>
                      </div>
                      <p className="text-sm text-[#6E7680] dark:text-dark-text-muted mb-2 transition-colors">{activity.detail}</p>
                      <div className="flex items-center gap-1 text-xs text-[#9CA3AF] dark:text-dark-text-muted transition-colors">
                        <Clock className="w-3 h-3" />
                        <span>{activity.timestamp.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-6">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-red-500/20 flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1">
                 <h3 className="text-xl font-semibold text-[#232333] dark:text-white transition-colors mb-2">
    {t('messages.deleteTitle')}
  </h3>

  <p className="text-sm text-slate-300 mb-4">
    {t('messages.deleteDescription').split('destructive action')[0]}
    <span className="font-semibold text-red-400">
      destructive action
    </span>
    {t('messages.deleteDescription').split('destructive action')[1]}
  </p>

                  
                  <div className="space-y-4 mt-6">
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                        <input
                          type="checkbox"
                          checked={deleteUserMessages}
                          onChange={(e) => setDeleteUserMessages(e.target.checked)}
                          className="w-5 h-5 accent-red-600"
                        />
                        <div className="flex-1">
                          <span className="text-white font-medium">{t('messages.usersLabel')}</span>
                          <p className="text-xs text-slate-400 mt-1">{t('messages.usersHelp')}</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                        <input
                          type="checkbox"
                          checked={deleteAdminMessages}
                          onChange={(e) => setDeleteAdminMessages(e.target.checked)}
                          className="w-5 h-5 accent-red-600"
                        />
                        <div className="flex-1">
                          <span className="text-white font-medium">{t('messages.adminsLabel')}</span>
                          <p className="text-xs text-slate-400 mt-1">{t('messages.adminsHelp')}</p>
                        </div>
                      </label>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      <button
                        onClick={() => {
                          if (!deleteUserMessages && !deleteAdminMessages) {
                            toast.error('Please select at least one option');
                            return;
                          }
                          setShowDeleteConfirm(true);
                          setConfirmationText('');
                          setDeleteSuccess(false);
                        }}
                        disabled={!deleteUserMessages && !deleteAdminMessages}
                        className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-5 h-5" />
                        {t('messages.deleteButton')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ask HR Bot and Contact Users already handled above for 'chat' and 'contact' tabs */}
      </div>

      {/* Delete Messages Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden transition-colors">
            <div className="p-5 border-b border-[#E8E8E8] dark:border-dark-border bg-[#F6F6F6] dark:bg-dark-bg-primary flex items-start justify-between gap-4 transition-colors">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 flex-shrink-0 transition-colors">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-[#232333] dark:text-white transition-colors">
                    {t('messages.deleteTitle')}
                  </h3>
                  <p className="text-sm text-[#6E7680] dark:text-dark-text-muted mt-1 transition-colors">
                    {t('messages.deleteDescription')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setConfirmationText('');
                  setDeleteSuccess(false);
                }}
                disabled={isDeleting}
                className="p-2 rounded-xl hover:bg-[#E8E8E8] dark:hover:bg-dark-border text-[#6E7680] dark:text-dark-text-muted hover:text-[#232333] dark:hover:text-dark-text transition-colors"
                title={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="bg-[#F6F6F6] dark:bg-dark-surface-alt border border-[#E8E8E8] dark:border-dark-border rounded-xl p-4 transition-colors">
                <p className="text-sm font-medium text-[#232333] dark:text-dark-text mb-2 transition-colors">
                  {t('messages.aboutToDelete')}
                </p>
                <ul className="text-sm text-[#6E7680] dark:text-dark-text-muted space-y-1 ml-5 transition-colors">
                  {deleteUserMessages && (
                    <li className="list-disc">{t('messages.deleteUsers')}</li>
                  )}
                  {deleteAdminMessages && (
                    <li className="list-disc">{t('messages.deleteAdmins')}</li>
                  )}
                </ul>
              </div>

              <div>
                <p className="text-sm font-medium text-[#232333] dark:text-dark-text mb-2 transition-colors">
                  {t('messages.confirmLabel').replace('DELETE ALL MESSAGES', '')}
                  <span className="ml-2 font-mono bg-[#2563eb] text-white px-2 py-1 rounded-lg">
                    {t('messages.confirmText')}
                  </span>
                </p>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder={t('messages.confirmPlaceholder')}
                  className="w-full bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-xl px-4 py-3 text-[#232333] dark:text-dark-text placeholder-[#9CA3AF] dark:placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-[#2563eb] dark:focus:ring-dark-accent-blue focus:border-transparent font-mono transition-colors"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#E8E8E8] dark:border-dark-border">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setConfirmationText('');
                  setDeleteSuccess(false);
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 rounded-xl bg-[#F6F6F6] dark:bg-dark-surface-alt hover:bg-[#E8E8E8] dark:hover:bg-dark-surface disabled:opacity-50 disabled:cursor-not-allowed text-[#232333] dark:text-dark-text transition-colors font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={async () => {
                  if (confirmationText !== 'DELETE ALL MESSAGES') {
                    toast.error('Confirmation text does not match');
                    return;
                  }

                  setIsDeleting(true);
                  try {
                    const token = getToken();
                    const res = await fetch('/dev-api/api/messages/delete', {
                      method: 'DELETE',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                      body: JSON.stringify({
                        deleteUserMessages,
                        deleteAdminMessages,
                      }),
                    });

                    const data = await res.json();
                    if (data.code === 200) {
                      setDeleteSuccess(true);
                      toast.success(
  t('messages.deleteSuccess', {
    count: data.result?.deletedCount || 0,
  })
);
                      
                      // Clear all localStorage data related to messages/notifications
                      try {
                        // Clear local messages storage
                        localStorage.removeItem('notifications_messages');
                        // Clear read state for messages (since messages are deleted)
                        localStorage.removeItem('read_message_ids');
                        // Note: We keep read_notification_ids as those are for support notifications, not messages
                        console.log('Cleared all message-related localStorage data');
                      } catch (err) {
                        console.error('Failed to clear localStorage:', err);
                      }
                      
                      // Trigger a page reload after a short delay to refresh all notification states
                      // This ensures the UI reflects the deletion immediately and shows empty state
                      setTimeout(() => {
                        setShowDeleteConfirm(false);
                        setConfirmationText('');
                        setDeleteUserMessages(false);
                        setDeleteAdminMessages(false);
                        setDeleteSuccess(false);
                        setIsDeleting(false);
                        // Force a hard reload to clear all cached data
                        window.location.href = window.location.href.split('#')[0];
                      }, 2000);
                    } else {
                      toast.error(data.message || 'Failed to delete messages');
                      setIsDeleting(false);
                    }
                  } catch (err) {
                    console.error('Failed to delete messages:', err);
                    toast.error('Failed to delete messages. Please try again.');
                    setIsDeleting(false);
                  }
                }}
                disabled={confirmationText !== 'DELETE ALL MESSAGES' || isDeleting || deleteSuccess}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-[#E8E8E8] dark:disabled:bg-dark-border disabled:text-[#9CA3AF] dark:disabled:text-dark-text-muted disabled:cursor-not-allowed text-white transition-colors font-semibold flex items-center justify-center gap-2"
              >
                {isDeleting ? (
  <>
    <Clock className="w-4 h-4 animate-spin" />
    {t('messages.deleting')}
  </>
) : deleteSuccess ? (
  <>
    <CheckCircle className="w-4 h-4" />
    {t('messages.deleted')}
  </>
) : (
  <>
    <Trash2 className="w-4 h-4" />
    {t('messages.deletePermanently')}
  </>
)}

              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {pendingBulkDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-red-500/40 rounded-lg max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-3 rounded-lg bg-red-500/20">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
  {t('documentTable.deleteSelectedTitle')}
</h3>
<p className="text-sm text-slate-400">
  {t('documentTable.deleteWarning')}
</p>
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto bg-white/5 rounded-lg p-3 space-y-1">
              {pendingBulkDelete.map((d) => (
                <div key={d.id} className="text-sm text-white truncate" title={d.filename}>• {d.filename}</div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setPendingBulkDelete(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={async () => {
                  const docs = pendingBulkDelete;
                  setPendingBulkDelete(null);
                  for (const d of docs) {
                    await handleDeleteFile(d.id, d.filename);
                  }
                  setSelectedDocIds(new Set());
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {t('common.deleteAll')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
