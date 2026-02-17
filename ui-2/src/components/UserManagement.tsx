import { useState, useRef } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, X, Save, Upload, Users } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';

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
  const [editAdminPassword, setEditAdminPassword] = useState('');

  const getI18nLabel = (key: string, fallback: string) => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  };

  const getJobRoleLabel = (roleKey: string) => {
    const fallback = JOB_ROLE_OPTIONS.find((option) => option.key === roleKey)?.label || roleKey;
    return getI18nLabel(`user.jobRole.${roleKey}`, fallback);
  };

  const getAreaLabel = (areaKey: string) => {
    const fallback = AREA_OF_WORK_OPTIONS.find((option) => option.key === areaKey)?.label || areaKey;
    return getI18nLabel(`user.area.${areaKey}`, fallback);
  };

  const getI18nOrFallback = (key: string, fallback: string) => getI18nLabel(key, fallback);

  const selectJobRoleLabel = getI18nOrFallback('userManagement.form.selectJobRole', 'Select job role');
  const selectAreaLabel = getI18nOrFallback('userManagement.form.selectAreaOfWork', 'Select area of work');
  const firstNameLabel = getI18nOrFallback('userManagement.table.firstName', 'First name');
  const lastNameLabel = getI18nOrFallback('userManagement.table.lastName', 'Last name');
  const employeeIdLabel = getI18nOrFallback('userManagement.table.employeeId', 'Employee ID');
  const passwordLabel = getI18nOrFallback('userManagement.table.password', 'Password');

  const uploadCsvLabel = getI18nLabel('userManagement.uploadCsv', 'Upload CSV');
  const addUserLabel = getI18nLabel('userManagement.form.addUserTitle', 'Add User');

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
    if (editingUser && editAdminPassword.trim()) {
      setUsers(
        users.map((u) =>
          u.id === editingUser
            ? { ...u, ...formData, lastUpdated: new Date() }
            : u
        )
      );
      setEditingUser(null);
      setShowConfirmSave(false);
      setEditAdminPassword('');
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
    setEditAdminPassword('');
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
    <div className="space-y-6 pt-2 px-0 pb-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1e228a] dark:bg-[#00CCFF] rounded-lg transition-colors">
            <Users className="w-5 h-5 text-white dark:text-black" />
          </div>
          <h2 className="text-2xl font-bold text-foreground dark:text-white transition-colors">
            {t('userManagement.title')}
          </h2>
        </div>
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
              data-state={csvLoading ? 'loading' : 'idle'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg btn-success disabled:opacity-50 disabled:cursor-not-allowed text-on-accent text-sm font-medium transition-colors"
              title={uploadCsvLabel}
            >
              <Upload className={`w-4 h-4 icon-current ${csvLoading ? 'animate-pulse text-accent-strong' : ''}`} />
              {csvLoading ? t('common.loading') : uploadCsvLabel}
            </button>
            {/* Add User Button */}
            <button
              onClick={handleAddUser}
              className="flex items-center gap-2 px-4 py-2 rounded-lg btn-primary text-on-accent text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4 icon-current" />
              {addUserLabel}
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface dark:bg-dark-surface border border-default dark:border-default rounded-2xl overflow-hidden shadow-sm transition-colors">
        <table className="w-full">
          <thead className="bg-surface-alt dark:bg-dark-bg-primary border-b border-default dark:border-default transition-colors">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted dark:text-dark-text-muted transition-colors">
                {t('userManagement.table.firstName')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted dark:text-dark-text-muted transition-colors">
                {t('userManagement.table.lastName')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted dark:text-dark-text-muted transition-colors">
                {t('userManagement.table.employeeId')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted dark:text-dark-text-muted transition-colors">
                {t('userManagement.table.userJobRole')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted dark:text-dark-text-muted transition-colors">
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
                <td colSpan={9} className="px-4 py-8 text-center text-muted dark:text-dark-text-muted transition-colors">
                  {t('userManagement.empty')}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-default dark:border-default hover:bg-surface-alt dark:hover:bg-dark-border transition-colors"
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
                          className="w-full bg-surface dark:bg-dark-surface border border-default dark:border-default rounded px-2 py-1 text-foreground dark:text-dark-text text-sm focus:outline-none focus-ring-accent transition-colors"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) =>
                            setFormData({ ...formData, lastName: e.target.value })
                          }
                          className="w-full bg-surface dark:bg-dark-surface border border-default rounded px-2 py-1 text-foreground dark:text-dark-text text-sm focus:outline-none focus-ring-accent transition-colors"
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
                          className="w-full bg-surface dark:bg-dark-surface border border-default rounded px-2 py-1 text-foreground dark:text-dark-text text-sm focus:outline-none focus-ring-accent transition-colors"
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
                          className="w-full bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded px-2 py-1 text-[#232333] dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-[#1e228a] dark:focus:ring-[#00CCFF] transition-colors"
                        >
                        <option value="">{selectJobRoleLabel}</option>
                          {JOB_ROLE_OPTIONS.map((option) => (
                            <option key={option.key} value={option.key}>
                              {getJobRoleLabel(option.key)}
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
                          className="w-full bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded px-2 py-1 text-[#232333] dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-[#1e228a] dark:focus:ring-[#00CCFF] transition-colors"
                        >
                        <option value="">{selectAreaLabel}</option>
                          {AREA_OF_WORK_OPTIONS.map((option) => (
                            <option key={option.key} value={option.key}>
                              {getAreaLabel(option.key)}
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
                          className="w-full bg-surface dark:bg-dark-surface border border-default rounded px-2 py-1 text-foreground dark:text-dark-text text-sm focus:outline-none focus-ring-accent transition-colors"
                        >
                          <option value="user">{getI18nLabel('user.role.user', 'User')}</option>
                          <option value="admin">{getI18nLabel('user.role.admin', 'Admin')}</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({ ...formData, password: e.target.value })
                          }
                          className="w-full bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded px-2 py-1 text-[#232333] dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-[#1e228a] dark:focus:ring-[#00CCFF] transition-colors"
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
                          className="p-1 text-icon-muted dark:text-dark-text-muted hover:bg-surface hover:dark:bg-white/10 rounded transition-colors"
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
                        {getJobRoleLabel(user.userJobRole)}
                      </td>
                      <td className="px-4 py-3 text-[#6E7680] dark:text-dark-text-muted transition-colors">
                        {getAreaLabel(user.areaOfWork)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          } transition-colors`}
                        >
                          {getI18nLabel(`user.role.${user.role}`, user.role === 'admin' ? 'Admin' : 'User')}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex items-center gap-2">
                        <span className="text-[#6E7680] dark:text-dark-text-muted transition-colors">
                          {visiblePasswords.has(user.id) ? user.password : '••••••'}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(user.id)}
                          className="p-1 text-muted dark:text-dark-text-muted hover:bg-surface-alt dark:hover:bg-dark-border rounded transition-colors"
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
          <div className="bg-surface dark:bg-dark-surface border border-default dark:border-default rounded-2xl p-6 max-w-md w-full mx-4 space-y-4 shadow-xl transition-colors">
            <h3 className="text-xl font-semibold text-foreground dark:text-white transition-colors">
              {t('userManagement.form.addUserTitle')}
            </h3>

            <div className="space-y-3">
              <input
                type="text"
                placeholder={firstNameLabel}
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                className="w-full bg-surface dark:bg-dark-surface-alt border border-default dark:border-default rounded-lg px-3 py-2 text-foreground dark:text-dark-text placeholder-muted dark:placeholder-dark-text-muted focus:outline-none focus-ring-accent transition-colors"
              />
              <input
                type="text"
                placeholder={lastNameLabel}
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                className="w-full bg-surface dark:bg-dark-surface-alt border border-default dark:border-default rounded-lg px-3 py-2 text-foreground dark:text-dark-text placeholder-muted dark:placeholder-dark-text-muted focus:outline-none focus-ring-accent transition-colors"
              />
              <input
                type="text"
                placeholder={employeeIdLabel}
                value={formData.employeeId}
                onChange={(e) =>
                  setFormData({ ...formData, employeeId: e.target.value })
                }
                className="w-full bg-surface dark:bg-dark-surface-alt border border-default dark:border-default rounded-lg px-3 py-2 text-foreground dark:text-dark-text placeholder-muted dark:placeholder-dark-text-muted focus:outline-none focus-ring-accent transition-colors"
              />
              <select
                value={formData.userJobRole}
                onChange={(e) =>
                  setFormData({ ...formData, userJobRole: e.target.value })
                }
                className="w-full bg-surface dark:bg-dark-surface-alt border border-default dark:border-default rounded-lg px-3 py-2 text-foreground dark:text-dark-text focus:outline-none focus-ring-accent transition-colors"
              >
                <option value="">{selectJobRoleLabel}</option>
                {JOB_ROLE_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {getJobRoleLabel(option.key)}
                  </option>
                ))}
              </select>
              <select
                value={formData.areaOfWork}
                onChange={(e) =>
                  setFormData({ ...formData, areaOfWork: e.target.value })
                }
                className="w-full bg-surface dark:bg-dark-surface-alt border border-default dark:border-default rounded-lg px-3 py-2 text-foreground dark:text-dark-text focus:outline-none focus-ring-accent transition-colors"
              >
                <option value="">{selectAreaLabel}</option>
                {AREA_OF_WORK_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {getAreaLabel(option.key)}
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
                className="w-full bg-surface dark:bg-dark-surface-alt border border-default dark:border-default rounded-lg px-3 py-2 text-foreground dark:text-dark-text focus:outline-none focus-ring-accent transition-colors"
              >
                <option value="user">{getI18nLabel('user.role.user', 'User')}</option>
                <option value="admin">{getI18nLabel('user.role.admin', 'Admin')}</option>
              </select>
              <input
                type="text"
                placeholder={passwordLabel}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full bg-surface dark:bg-dark-surface-alt border border-default dark:border-default rounded-lg px-3 py-2 text-foreground dark:text-dark-text placeholder-muted dark:placeholder-dark-text-muted focus:outline-none focus-ring-accent transition-colors"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-default dark:border-default transition-colors">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg bg-surface dark:bg-dark-surface-alt hover:bg-surface-alt dark:hover:bg-dark-border text-foreground dark:text-dark-text text-sm font-medium transition-colors"
              >
                {t('userManagement.form.cancel')}
              </button>
              <button
                onClick={handleSaveNewUser}
                className="px-4 py-2 rounded-lg btn-primary text-on-accent text-sm font-medium transition-colors"
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
          <div className="bg-surface dark:bg-dark-surface border border-default dark:border-default rounded-2xl p-6 max-w-md w-full mx-4 space-y-4 shadow-xl transition-colors">
            <h3 className="text-xl font-semibold text-foreground dark:text-white transition-colors">
              {t('userManagement.delete.confirmTitle')}
            </h3>
            <p className="text-muted dark:text-dark-text-muted text-sm transition-colors">
              {t('userManagement.form.editUserTitle')}
            </p>

            <input
              type="password"
              placeholder={t('userManagement.delete.adminPassword')}
              value={editAdminPassword}
              onChange={(e) => setEditAdminPassword(e.target.value)}
              className="w-full bg-surface dark:bg-dark-surface-alt border border-default dark:border-default rounded-lg px-3 py-2 text-foreground dark:text-dark-text placeholder-muted dark:placeholder-dark-text-muted focus:outline-none focus-ring-accent transition-colors"
            />

            <div className="flex gap-3 justify-end pt-4 border-t border-default dark:border-default transition-colors">
              <button
                onClick={() => {
                  setShowConfirmSave(false);
                  setEditAdminPassword('');
                }}
                className="px-4 py-2 rounded-lg bg-surface dark:bg-dark-surface-alt hover:bg-surface-alt dark:hover:bg-dark-border text-foreground dark:text-dark-text text-sm font-medium transition-colors"
              >
                {t('userManagement.form.cancel')}
              </button>
              <button
                onClick={confirmSaveEdit}
                disabled={!editAdminPassword.trim()}
                className="px-4 py-2 rounded-lg btn-success text-on-accent text-sm font-medium transition-colors"
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
          <div className="bg-surface dark:bg-dark-surface border border-default dark:border-default rounded-2xl p-6 max-w-md w-full mx-4 space-y-4 shadow-xl transition-colors">
            <h3 className="text-xl font-semibold text-foreground dark:text-white transition-colors">
              {t('userManagement.delete.adminPassword')}
            </h3>
            <p className="text-muted dark:text-dark-text-muted text-sm transition-colors">
              {t('userManagement.delete.confirmMessage')}
            </p>

            <input
              type="password"
              placeholder={t('userManagement.delete.adminPassword')}
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full bg-surface dark:bg-dark-surface-alt border border-default dark:border-default rounded-lg px-3 py-2 text-foreground dark:text-dark-text placeholder-muted dark:placeholder-dark-text-muted focus:outline-none focus-ring-accent transition-colors"
            />

            <div className="flex gap-3 justify-end pt-4 border-t border-default dark:border-default transition-colors">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                  setAdminPassword('');
                }}
                className="px-4 py-2 rounded-lg bg-surface dark:bg-dark-surface-alt hover:bg-surface-alt dark:hover:bg-dark-border text-foreground dark:text-dark-text text-sm font-medium transition-colors"
              >
                {t('userManagement.form.cancel')}
              </button>
              <button
                onClick={confirmDelete}
                disabled={!adminPassword.trim()}
                className="px-4 py-2 rounded-lg btn-danger disabled:opacity-50 disabled:cursor-not-allowed text-on-accent text-sm font-medium transition-colors"
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
