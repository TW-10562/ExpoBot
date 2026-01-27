import { useState, useRef } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, X, Save, Upload } from 'lucide-react';
import { useLang } from '../context/LanguageContext';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  userJobRole: string; // e.g., 'ai_engineer'
  areaOfWork: string; // e.g., 'ayase'
  role: 'admin' | 'user';
  password: string;
  lastUpdated: Date;
}

interface FormData {
  firstName: string;
  lastName: string;
  employeeId: string;
  userJobRole: string; // e.g., 'ai_engineer'
  areaOfWork: string; // e.g., 'ayase'
  role: 'admin' | 'user';
  password: string;
}

// Stable keys for Job Roles (used for storage and CSV)
const JOB_ROLE_OPTIONS = [
  { key: 'ai_engineer', label: 'AI Engineer' },
  { key: 'system_engineer', label: 'System Engineer' },
  { key: 'it_manager', label: 'IT Manager' },
  { key: 'tl', label: 'TL' },
  { key: 'hr', label: 'HR' },
  { key: 'sales_manager', label: 'Sales Manager' },
  { key: 'sales_person', label: 'Sales Person' },
  { key: 'tester', label: 'Tester' },
  { key: 'factory_worker', label: 'Factory Worker' },
  { key: 'call_center_agent', label: 'Call Center Agent' },
];

// Stable keys for Areas of Work (used for storage and CSV)
const AREA_OF_WORK_OPTIONS = [
  { key: 'ayase', label: 'Ayase' },
  { key: 'ebina', label: 'Ebina' },
  { key: 'akihabara_main', label: 'Akihabara Main Building' },
  { key: 'akihabara_daidoh', label: 'Akihabara Daidoh Building' },
  { key: 'hiratsuka', label: 'Hiratsuka' },
];

// Helper function to convert display labels to stable keys
// Accepts either stable keys or display labels and returns stable key
const normalizeJobRole = (value: string): string => {
  const trimmed = value.trim().toLowerCase();
  
  // Check if it's already a stable key
  const jobRoleKey = JOB_ROLE_OPTIONS.find(
    (opt) => opt.key === trimmed || opt.key === value.trim()
  )?.key;
  if (jobRoleKey) return jobRoleKey;
  
  // Try to match by display label (case-insensitive)
  const jobRoleByLabel = JOB_ROLE_OPTIONS.find(
    (opt) => opt.label.toLowerCase() === trimmed
  )?.key;
  if (jobRoleByLabel) return jobRoleByLabel;
  
  // Fallback: return original value
  return value.trim();
};

const normalizeArea = (value: string): string => {
  const trimmed = value.trim().toLowerCase();
  
  // Check if it's already a stable key
  const areaKey = AREA_OF_WORK_OPTIONS.find(
    (opt) => opt.key === trimmed || opt.key === value.trim()
  )?.key;
  if (areaKey) return areaKey;
  
  // Try to match by display label (case-insensitive)
  const areaByLabel = AREA_OF_WORK_OPTIONS.find(
    (opt) => opt.label.toLowerCase() === trimmed
  )?.key;
  if (areaByLabel) return areaByLabel;
  
  // Fallback: return original value
  return value.trim();
};

const mockUsers: User[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    employeeId: 'EMP001',
    userJobRole: 'ai_engineer',
    areaOfWork: 'ayase',
    role: 'user',
    password: 'pass123',
    lastUpdated: new Date(2024, 0, 15),
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    employeeId: 'EMP002',
    userJobRole: 'system_engineer',
    areaOfWork: 'ebina',
    role: 'admin',
    password: 'pass456',
    lastUpdated: new Date(2024, 0, 10),
  },
];

export default function UserManagement() {
  const { t } = useLang();
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    employeeId: '',
    userJobRole: '',
    areaOfWork: '',
    role: 'user',
    password: '',
  });
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');

  // CSV Upload Handler - accepts both stable keys and display labels
  // e.g., can accept either 'ai_engineer' or 'AI Engineer' and normalizes to 'ai_engineer'
  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        
        // Skip header row
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const newUsers: User[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.split(',').map(v => v.trim());
          
          // Map CSV columns to user fields
          const firstNameIdx = headers.indexOf('first name');
          const lastNameIdx = headers.indexOf('last name');
          const employeeIdIdx = headers.indexOf('employee id');
          const jobRoleIdx = headers.indexOf('user job role');
          const areaOfWorkIdx = headers.indexOf('area of work');
          const roleIdx = headers.indexOf('role');
          const passwordIdx = headers.indexOf('password');
          
          // Normalize job role and area to stable keys (supports both stable keys and display labels)
          const jobRoleValue = values[jobRoleIdx] || '';
          const areaValue = values[areaOfWorkIdx] || '';
          
          const newUser: User = {
            id: String(users.length + newUsers.length + 1),
            firstName: values[firstNameIdx] || '',
            lastName: values[lastNameIdx] || '',
            employeeId: values[employeeIdIdx] || '',
            userJobRole: normalizeJobRole(jobRoleValue), // Converts display label to stable key
            areaOfWork: normalizeArea(areaValue), // Converts display label to stable key
            role: (values[roleIdx]?.toLowerCase() === 'admin' ? 'admin' : 'user'),
            password: values[passwordIdx] || '',
            lastUpdated: new Date(),
          };
          
          if (newUser.firstName && newUser.lastName) {
            newUsers.push(newUser);
          }
        }
        
        setUsers([...users, ...newUsers]);
        setCsvLoading(false);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('CSV parsing error:', error);
        setCsvLoading(false);
      }
    };
    
    reader.readAsText(file);
  };

  const handleAddUser = () => {
    setFormData({
      firstName: '',
      lastName: '',
      employeeId: '',
      userJobRole: '',
      areaOfWork: '',
      role: 'user',
      password: '',
    });
    setShowAddModal(true);
  };

  const handleSaveNewUser = () => {
    if (!formData.firstName || !formData.lastName) {
      return;
    }
    const newUser: User = {
      id: String(users.length + 1),
      ...formData,
      lastUpdated: new Date(),
    };
    setUsers([...users, newUser]);
    setShowAddModal(false);
    setFormData({
      firstName: '',
      lastName: '',
      employeeId: '',
      userJobRole: '',
      areaOfWork: '',
      role: 'user',
      password: '',
    });
  };

  const handleEditUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        employeeId: user.employeeId,
        userJobRole: user.userJobRole,
        areaOfWork: user.areaOfWork,
        role: user.role,
        password: user.password,
      });
      setEditingUser(userId);
    }
  };

  const handleSaveEdit = () => {
    if (editingUser) {
      setShowConfirmSave(true);
    }
  };

  const confirmSaveEdit = () => {
    if (editingUser) {
      setUsers(
        users.map((u) =>
          u.id === editingUser
            ? { ...u, ...formData, lastUpdated: new Date() }
            : u
        )
      );
      setEditingUser(null);
      setShowConfirmSave(false);
      setFormData({
        firstName: '',
        lastName: '',
        employeeId: '',
        userJobRole: '',
        areaOfWork: '',
        role: 'user',
        password: '',
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setFormData({
      firstName: '',
      lastName: '',
      employeeId: '',
      userJobRole: '',
      areaOfWork: '',
      role: 'user',
      password: '',
    });
  };

  const handleDeleteUser = (userId: string) => {
    setUserToDelete(userId);
    setShowDeleteModal(true);
    setAdminPassword('');
  };

  const confirmDelete = () => {
    if (userToDelete && adminPassword.trim()) {
      setUsers(users.filter((u) => u.id !== userToDelete));
      setShowDeleteModal(false);
      setUserToDelete(null);
      setAdminPassword('');
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    const newSet = new Set(visiblePasswords);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setVisiblePasswords(newSet);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xl font-semibold text-[#232333] dark:text-white transition-colors">
          {t('userManagement.title')}
        </h3>
        {!editingUser && (
          <div className="flex items-center gap-2">
            {/* CSV Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={csvLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 disabled:bg-[#9CA3AF] dark:disabled:bg-[#6E7680] disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              title={t('userManagement.uploadCsv') || 'Upload CSV'}
            >
              <Upload className="w-4 h-4" />
              {csvLoading ? t('common.loading') : t('userManagement.uploadCsv')}
            </button>
            {/* Add User Button */}
            <button
              onClick={handleAddUser}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1d2089] hover:bg-[#161870] dark:bg-dark-accent-blue dark:hover:bg-[#3b82f6] text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('userManagement.form.addUserTitle')}
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-2xl overflow-hidden shadow-sm transition-colors">
        <table className="w-full">
          <thead className="bg-[#F6F6F6] dark:bg-dark-bg-primary border-b border-[#E8E8E8] dark:border-dark-border transition-colors">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">
                {t('userManagement.table.firstName')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">
                {t('userManagement.table.lastName')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">
                {t('userManagement.table.employeeId')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">
                {t('userManagement.table.userJobRole')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">
                {t('userManagement.table.areaOfWork')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">
                {t('userManagement.table.role')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">
                {t('userManagement.table.password')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">
                {t('userManagement.table.lastUpdated')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">
                {t('userManagement.table.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-[#6E7680] dark:text-dark-text-muted transition-colors">
                  {t('userManagement.empty')}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[#E8E8E8] dark:border-dark-border hover:bg-[#F6F6F6] dark:hover:bg-dark-border transition-colors"
                >
                  {editingUser === user.id ? (
                    // Edit Mode
                    <>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) =>
                            setFormData({ ...formData, firstName: e.target.value })
                          }
                          className="w-full bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded px-2 py-1 text-[#232333] dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) =>
                            setFormData({ ...formData, lastName: e.target.value })
                          }
                          className="w-full bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded px-2 py-1 text-[#232333] dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={formData.employeeId}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              employeeId: e.target.value,
                            })
                          }
                          className="w-full bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded px-2 py-1 text-[#232333] dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={formData.userJobRole}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              userJobRole: e.target.value,
                            })
                          }
                          className="w-full bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded px-2 py-1 text-[#232333] dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors"
                        >
                          <option value="">{t('userManagement.form.selectJobRole')}</option>
                          {JOB_ROLE_OPTIONS.map((option) => (
                            <option key={option.key} value={option.key}>
                              {t(`user.jobRole.${option.key}`)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={formData.areaOfWork}
                          onChange={(e) =>
                            setFormData({ ...formData, areaOfWork: e.target.value })
                          }
                          className="w-full bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded px-2 py-1 text-[#232333] dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors"
                        >
                          <option value="">{t('userManagement.form.selectAreaOfWork')}</option>
                          {AREA_OF_WORK_OPTIONS.map((option) => (
                            <option key={option.key} value={option.key}>
                              {t(`user.area.${option.key}`)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={formData.role}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              role: e.target.value as 'admin' | 'user',
                            })
                          }
                          className="w-full bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded px-2 py-1 text-[#232333] dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors"
                        >
                          <option value="user">{t('user.role.user')}</option>
                          <option value="admin">{t('user.role.admin')}</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({ ...formData, password: e.target.value })
                          }
                          className="w-full bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded px-2 py-1 text-[#232333] dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors"
                        />
                      </td>
                      <td className="px-4 py-3 text-[#6E7680] dark:text-dark-text-muted text-sm transition-colors">
                        {user.lastUpdated.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/20 rounded transition-colors"
                          title={t('userManagement.form.save')}
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 text-[#6E7680] dark:text-dark-text-muted hover:bg-white dark:hover:bg-white/10 rounded transition-colors"
                          title={t('userManagement.form.cancel')}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </>
                  ) : (
                    // View Mode
                    <>
                      <td className="px-4 py-3 text-[#232333] dark:text-dark-text font-medium transition-colors">
                        {user.firstName}
                      </td>
                      <td className="px-4 py-3 text-[#232333] dark:text-dark-text font-medium transition-colors">
                        {user.lastName}
                      </td>
                      <td className="px-4 py-3 text-[#6E7680] dark:text-dark-text-muted transition-colors">{user.employeeId}</td>
                      <td className="px-4 py-3 text-[#6E7680] dark:text-dark-text-muted transition-colors">
                        {t(`user.jobRole.${user.userJobRole}`)}
                      </td>
                      <td className="px-4 py-3 text-[#6E7680] dark:text-dark-text-muted transition-colors">
                        {t(`user.area.${user.areaOfWork}`)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          } transition-colors`}
                        >
                          {t(`user.role.${user.role}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex items-center gap-2">
                        <span className="text-[#6E7680] dark:text-dark-text-muted transition-colors">
                          {visiblePasswords.has(user.id) ? user.password : '••••••'}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(user.id)}
                          className="p-1 text-[#6E7680] dark:text-dark-text-muted hover:bg-[#F6F6F6] dark:hover:bg-dark-border rounded transition-colors"
                          title={
                            visiblePasswords.has(user.id)
                              ? t('userManagement.password.hide')
                              : t('userManagement.password.show')
                          }
                        >
                          {visiblePasswords.has(user.id) ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-[#6E7680] dark:text-dark-text-muted text-sm transition-colors">
                        {user.lastUpdated.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        <button
                          onClick={() => handleEditUser(user.id)}
                          className="p-1 text-blue-600 dark:text-dark-accent-blue hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded transition-colors"
                          title={t('userManagement.form.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 rounded transition-colors"
                          title={t('userManagement.form.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-2xl p-6 max-w-md w-full mx-4 space-y-4 shadow-xl transition-colors">
            <h3 className="text-xl font-semibold text-[#232333] dark:text-white transition-colors">
              {t('userManagement.form.addUserTitle')}
            </h3>

            <div className="space-y-3">
              <input
                type="text"
                placeholder={t('userManagement.table.firstName')}
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                className="w-full bg-white dark:bg-dark-surface-alt border border-[#E8E8E8] dark:border-dark-border rounded-lg px-3 py-2 text-[#232333] dark:text-dark-text placeholder-[#9CA3AF] dark:placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors"
              />
              <input
                type="text"
                placeholder={t('userManagement.table.lastName')}
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                className="w-full bg-white dark:bg-dark-surface-alt border border-[#E8E8E8] dark:border-dark-border rounded-lg px-3 py-2 text-[#232333] dark:text-dark-text placeholder-[#9CA3AF] dark:placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors"
              />
              <input
                type="text"
                placeholder={t('userManagement.table.employeeId')}
                value={formData.employeeId}
                onChange={(e) =>
                  setFormData({ ...formData, employeeId: e.target.value })
                }
                className="w-full bg-white dark:bg-dark-surface-alt border border-[#E8E8E8] dark:border-dark-border rounded-lg px-3 py-2 text-[#232333] dark:text-dark-text placeholder-[#9CA3AF] dark:placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors"
              />
              <select
                value={formData.userJobRole}
                onChange={(e) =>
                  setFormData({ ...formData, userJobRole: e.target.value })
                }
                className="w-full bg-white dark:bg-dark-surface-alt border border-[#E8E8E8] dark:border-dark-border rounded-lg px-3 py-2 text-[#232333] dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors"
              >
                <option value="">{t('userManagement.form.selectJobRole')}</option>
                {JOB_ROLE_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {t(`user.jobRole.${option.key}`)}
                  </option>
                ))}
              </select>
              <select
                value={formData.areaOfWork}
                onChange={(e) =>
                  setFormData({ ...formData, areaOfWork: e.target.value })
                }
                className="w-full bg-white dark:bg-dark-surface-alt border border-[#E8E8E8] dark:border-dark-border rounded-lg px-3 py-2 text-[#232333] dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors"
              >
                <option value="">{t('userManagement.form.selectAreaOfWork')}</option>
                {AREA_OF_WORK_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {t(`user.area.${option.key}`)}
                  </option>
                ))}
              </select>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role: e.target.value as 'admin' | 'user',
                  })
                }
                className="w-full bg-white dark:bg-dark-surface-alt border border-[#E8E8E8] dark:border-dark-border rounded-lg px-3 py-2 text-[#232333] dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors"
              >
                <option value="user">{t('user.role.user')}</option>
                <option value="admin">{t('user.role.admin')}</option>
              </select>
              <input
                type="text"
                placeholder={t('userManagement.table.password')}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full bg-white dark:bg-dark-surface-alt border border-[#E8E8E8] dark:border-dark-border rounded-lg px-3 py-2 text-[#232333] dark:text-dark-text placeholder-[#9CA3AF] dark:placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-[#E8E8E8] dark:border-dark-border transition-colors">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg bg-[#F6F6F6] dark:bg-dark-surface-alt hover:bg-[#E8E8E8] dark:hover:bg-dark-border text-[#232333] dark:text-dark-text text-sm font-medium transition-colors"
              >
                {t('userManagement.form.cancel')}
              </button>
              <button
                onClick={handleSaveNewUser}
                className="px-4 py-2 rounded-lg bg-[#1d2089] hover:bg-[#161870] dark:bg-dark-accent-blue dark:hover:bg-[#3b82f6] text-white text-sm font-medium transition-colors"
              >
                {t('userManagement.form.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Save Modal */}
      {showConfirmSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-2xl p-6 max-w-md w-full mx-4 space-y-4 shadow-xl transition-colors">
            <h3 className="text-xl font-semibold text-[#232333] dark:text-white transition-colors">
              {t('userManagement.delete.confirmTitle')}
            </h3>
            <p className="text-[#6E7680] dark:text-dark-text-muted text-sm transition-colors">
              {t('userManagement.form.editUserTitle')}
            </p>

            <div className="flex gap-3 justify-end pt-4 border-t border-[#E8E8E8] dark:border-dark-border transition-colors">
              <button
                onClick={() => setShowConfirmSave(false)}
                className="px-4 py-2 rounded-lg bg-[#F6F6F6] dark:bg-dark-surface-alt hover:bg-[#E8E8E8] dark:hover:bg-dark-border text-[#232333] dark:text-dark-text text-sm font-medium transition-colors"
              >
                {t('userManagement.form.cancel')}
              </button>
              <button
                onClick={confirmSaveEdit}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white text-sm font-medium transition-colors"
              >
                {t('userManagement.form.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - Step 1 */}
      {showDeleteModal && !adminPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-2xl p-6 max-w-md w-full mx-4 space-y-4 shadow-xl transition-colors">
            <h3 className="text-xl font-semibold text-[#232333] dark:text-white transition-colors">
              {t('userManagement.delete.adminPassword')}
            </h3>
            <p className="text-[#6E7680] dark:text-dark-text-muted text-sm transition-colors">
              {t('userManagement.delete.confirmMessage')}
            </p>

            <input
              type="password"
              placeholder={t('userManagement.delete.adminPassword')}
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full bg-white dark:bg-dark-surface-alt border border-[#E8E8E8] dark:border-dark-border rounded-lg px-3 py-2 text-[#232333] dark:text-dark-text placeholder-[#9CA3AF] dark:placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors"
            />

            <div className="flex gap-3 justify-end pt-4 border-t border-[#E8E8E8] dark:border-dark-border transition-colors">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                  setAdminPassword('');
                }}
                className="px-4 py-2 rounded-lg bg-[#F6F6F6] dark:bg-dark-surface-alt hover:bg-[#E8E8E8] dark:hover:bg-dark-border text-[#232333] dark:text-dark-text text-sm font-medium transition-colors"
              >
                {t('userManagement.form.cancel')}
              </button>
              <button
                onClick={confirmDelete}
                disabled={!adminPassword.trim()}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 disabled:bg-[#9CA3AF] dark:disabled:bg-[#6E7680] disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {t('userManagement.delete.confirmButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
