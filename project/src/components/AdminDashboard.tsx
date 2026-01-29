import { useState } from 'react';
import {
  Upload,
  FileText,
  Users,
  Activity,
  Bell,
  CheckCircle,
  Clock,
  Archive,
  Send,
} from 'lucide-react';
import { MOCK_DOCUMENTS } from '../constants';

type Tab = 'documents' | 'users' | 'activity' | 'notifications';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('documents');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');

  const handleFileUpload = () => {
    alert('File upload functionality would be implemented here. In production, this would allow admins to upload HR policy documents.');
  };

  const handleSendNotification = () => {
    if (!notificationTitle || !notificationMessage) {
      alert('Please fill in all fields');
      return;
    }
    alert(`Notification sent to all users:\nTitle: ${notificationTitle}\nMessage: ${notificationMessage}`);
    setNotificationTitle('');
    setNotificationMessage('');
  };

  const tabs = [
    { id: 'documents' as Tab, label: 'Documents', icon: FileText },
    { id: 'users' as Tab, label: 'Users', icon: Users },
    { id: 'activity' as Tab, label: 'Activity', icon: Activity },
    { id: 'notifications' as Tab, label: 'Notifications', icon: Bell },
  ];

  const mockUsers = [
    {
      id: '1',
      name: 'John Smith',
      employeeId: 'user1234',
      department: 'Engineering',
      lastActive: new Date(Date.now() - 3600000),
      queries: 23,
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      employeeId: 'user5678',
      department: 'Marketing',
      lastActive: new Date(Date.now() - 7200000),
      queries: 15,
    },
    {
      id: '3',
      name: 'Michael Chen',
      employeeId: 'user9012',
      department: 'Finance',
      lastActive: new Date(Date.now() - 86400000),
      queries: 8,
    },
  ];

  const mockActivity = [
    {
      id: '1',
      user: 'John Smith',
      action: 'Query submitted',
      detail: 'What is the annual leave policy?',
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: '2',
      user: 'Admin User',
      action: 'Document uploaded',
      detail: 'HR_Policy_Manual_2024.pdf',
      timestamp: new Date(Date.now() - 7200000),
    },
    {
      id: '3',
      user: 'Sarah Johnson',
      action: 'Query submitted',
      detail: 'Remote work policy inquiry',
      timestamp: new Date(Date.now() - 10800000),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-white/10 bg-black/20">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 transition-all ${
              activeTab === tab.id
                ? 'bg-white/10 border-b-2 border-blue-500 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Document Management</h3>
              <button
                onClick={handleFileUpload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Upload className="w-5 h-5" />
                <span>Upload Document</span>
              </button>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Document Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Version
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Uploaded By
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Upload Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_DOCUMENTS.map((doc) => (
                    <tr key={doc.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 text-white">{doc.name}</td>
                      <td className="px-4 py-3 text-slate-300">{doc.version}</td>
                      <td className="px-4 py-3 text-slate-300">{doc.uploadedBy}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {doc.uploadedAt.toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            doc.status === 'active'
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-slate-500/20 text-slate-300'
                          }`}
                        >
                          {doc.status === 'active' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <Archive className="w-3 h-3" />
                          )}
                          {doc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white">User Management</h3>

            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Employee ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Department
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Last Active
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Queries
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mockUsers.map((user) => (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 text-white font-medium">{user.name}</td>
                      <td className="px-4 py-3 text-slate-300">{user.employeeId}</td>
                      <td className="px-4 py-3 text-slate-300">{user.department}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {user.lastActive.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{user.queries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white">Activity Log</h3>

            <div className="space-y-3">
              {mockActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Activity className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium">{activity.user}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-300">{activity.action}</span>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">{activity.detail}</p>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
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

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white">Send Notification</h3>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Notification Title
                </label>
                <input
                  type="text"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder="Enter notification title"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Message
                </label>
                <textarea
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  placeholder="Enter notification message"
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <button
                onClick={handleSendNotification}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Send className="w-5 h-5" />
                <span>Send to All Users</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
