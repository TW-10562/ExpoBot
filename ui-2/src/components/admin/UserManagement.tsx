import { useEffect, useRef, useState } from 'react';
import { Plus, Edit, Trash2, X, Save, Upload } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  importAdminUsersCsv,
  updateAdminUser,
} from '../../api/adminUsers';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  userJobRole: string;
  areaOfWork: string;
  role: 'admin' | 'user';
  lastUpdated: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  employeeId: string;
  userJobRole: string;
  areaOfWork: string;
  role: 'admin' | 'user';
  password: string;
}

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

const AREA_OF_WORK_OPTIONS = [
  { key: 'ayase', label: 'Ayase' },
  { key: 'ebina', label: 'Ebina' },
  { key: 'akihabara_main', label: 'Akihabara Main Building' },
  { key: 'akihabara_daidoh', label: 'Akihabara Daidoh Building' },
  { key: 'hiratsuka', label: 'Hiratsuka' },
];

const normalizeJobRole = (value: string): string => {
  const trimmed = value.trim().toLowerCase();
  const jobRoleKey = JOB_ROLE_OPTIONS.find((opt) => opt.key === trimmed || opt.key === value.trim())?.key;
  if (jobRoleKey) return jobRoleKey;
  const jobRoleByLabel = JOB_ROLE_OPTIONS.find((opt) => opt.label.toLowerCase() === trimmed)?.key;
  if (jobRoleByLabel) return jobRoleByLabel;
  return value.trim();
};

const normalizeArea = (value: string): string => {
  const trimmed = value.trim().toLowerCase();
  const areaKey = AREA_OF_WORK_OPTIONS.find((opt) => opt.key === trimmed || opt.key === value.trim())?.key;
  if (areaKey) return areaKey;
  const areaByLabel = AREA_OF_WORK_OPTIONS.find((opt) => opt.label.toLowerCase() === trimmed)?.key;
  if (areaByLabel) return areaByLabel;
  return value.trim();
};

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  employeeId: '',
  userJobRole: '',
  areaOfWork: '',
  role: 'user',
  password: '',
};

export default function UserManagement() {
  const { t } = useLang();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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
  const optionalPasswordLabel = getI18nOrFallback('userManagement.password.changeOptional', 'Leave blank to keep');

  const uploadCsvLabel = getI18nLabel('userManagement.uploadCsv', 'Upload CSV');
  const addUserLabel = getI18nLabel('userManagement.form.addUserTitle', 'Add User');

  const loadUsers = async () => {
    setLoading(true);
    setErrorMessage('');
    const response = await fetchAdminUsers();
    if (response.code !== 200) {
      setErrorMessage(response.message || 'Failed to fetch users');
      setLoading(false);
      return;
    }

    const mapped = (response.result || []).map((item) => ({
      id: String(item.user_id),
      firstName: item.first_name || '',
      lastName: item.last_name || '',
      employeeId: item.emp_id || '',
      userJobRole: item.job_role_key || '',
      areaOfWork: item.area_of_work_key || '',
      role: item.role === 'admin' ? 'admin' : 'user',
      lastUpdated: item.updated_at,
    }));

    setUsers(mapped);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvLoading(true);
    setErrorMessage('');

    const response = await importAdminUsersCsv(file);
    if (response.code !== 200) {
      setErrorMessage(response.message || 'CSV upload failed');
      setCsvLoading(false);
      return;
    }

    await loadUsers();
    setCsvLoading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddUser = () => {
    setFormData(initialFormData);
    setShowAddModal(true);
  };

  const buildPayload = (passwordOptional = false) => {
    const payload: any = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      employeeId: formData.employeeId.trim(),
      userJobRole: normalizeJobRole(formData.userJobRole),
      areaOfWork: normalizeArea(formData.areaOfWork),
      role: formData.role,
    };

    if (!passwordOptional || formData.password.trim()) {
      payload.password = formData.password;
    }

    return payload;
  };

  const handleSaveNewUser = async () => {
    if (!formData.firstName || !formData.lastName || !formData.employeeId || !formData.password) {
      return;
    }

    setErrorMessage('');
    const response = await createAdminUser(buildPayload(false));
    if (response.code !== 200) {
      setErrorMessage(response.message || 'Failed to create user');
      return;
    }

    setShowAddModal(false);
    setFormData(initialFormData);
    await loadUsers();
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
        password: '',
      });
      setEditingUser(userId);
    }
  };

  const handleSaveEdit = () => {
    if (editingUser) {
      setShowConfirmSave(true);
    }
  };

  const confirmSaveEdit = async () => {
    if (editingUser && editAdminPassword.trim()) {
      setErrorMessage('');
      const response = await updateAdminUser(editingUser, buildPayload(true));
      if (response.code !== 200) {
        setErrorMessage(response.message || 'Failed to update user');
        return;
      }

      setEditingUser(null);
      setShowConfirmSave(false);
      setEditAdminPassword('');
      setFormData(initialFormData);
      await loadUsers();
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditAdminPassword('');
    setFormData(initialFormData);
  };

  const handleDeleteUser = (userId: string) => {
    setUserToDelete(userId);
    setShowDeleteModal(true);
    setAdminPassword('');
  };

  const confirmDelete = async () => {
    if (userToDelete && adminPassword.trim()) {
      setErrorMessage('');
      const response = await deleteAdminUser(userToDelete);
      if (response.code !== 200) {
        setErrorMessage(response.message || 'Failed to delete user');
        return;
      }

      setShowDeleteModal(false);
      setUserToDelete(null);
      setAdminPassword('');
      await loadUsers();
    }
  };

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value || '-';
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xl font-semibold text-foreground dark:text-white transition-colors">
          {t('userManagement.title')}
        </h3>
        {!editingUser && (
          <div className="flex items-center gap-2">
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

      {errorMessage && (
        <div className="px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
          {errorMessage}
        </div>
      )}

      <div className="bg-surface dark:bg-dark-surface border border-default dark:border-default rounded-2xl overflow-hidden shadow-sm transition-colors">
        <table className="w-full">
          <thead className="bg-surface-alt dark:bg-dark-bg-primary border-b border-default dark:border-default transition-colors">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted dark:text-dark-text-muted transition-colors">{t('userManagement.table.firstName')}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted dark:text-dark-text-muted transition-colors">{t('userManagement.table.lastName')}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted dark:text-dark-text-muted transition-colors">{t('userManagement.table.employeeId')}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted dark:text-dark-text-muted transition-colors">{t('userManagement.table.userJobRole')}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted dark:text-dark-text-muted transition-colors">{t('userManagement.table.areaOfWork')}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">{t('userManagement.table.role')}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">{t('userManagement.table.password')}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">{t('userManagement.table.lastUpdated')}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#6E7680] dark:text-dark-text-muted transition-colors">{t('userManagement.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted dark:text-dark-text-muted transition-colors">
                  {t('common.loading')}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted dark:text-dark-text-muted transition-colors">
                  {t('userManagement.empty')}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-default dark:border-default hover:bg-surface-alt dark:hover:bg-dark-border transition-colors">
                  {editingUser === user.id ? (
                    <>
                      <td className="px-4 py-3">
                        <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full bg-surface dark:bg-dark-surface border border-default dark:border-default rounded px-2 py-1 text-foreground dark:text-dark-text text-sm focus:outline-none focus-ring-accent transition-colors" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full bg-surface dark:bg-dark-surface border border-default rounded px-2 py-1 text-foreground dark:text-dark-text text-sm focus:outline-none focus-ring-accent transition-colors" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="text" value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} className="w-full bg-surface dark:bg-dark-surface border border-default rounded px-2 py-1 text-foreground dark:text-dark-text text-sm focus:outline-none focus-ring-accent transition-colors" />
                      </td>
                      <td className="px-4 py-3">
                        <select value={formData.userJobRole} onChange={(e) => setFormData({ ...formData, userJobRole: e.target.value })} className="w-full bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded px-2 py-1 text-[#232333] dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors">
                          <option value="">{selectJobRoleLabel}</option>
                          {JOB_ROLE_OPTIONS.map((option) => (
                            <option key={option.key} value={option.key}>{getJobRoleLabel(option.key)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select value={formData.areaOfWork} onChange={(e) => setFormData({ ...formData, areaOfWork: e.target.value })} className="w-full bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded px-2 py-1 text-[#232333] dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors">
                          <option value="">{selectAreaLabel}</option>
                          {AREA_OF_WORK_OPTIONS.map((option) => (
                            <option key={option.key} value={option.key}>{getAreaLabel(option.key)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })} className="w-full bg-surface dark:bg-dark-surface border border-default rounded px-2 py-1 text-foreground dark:text-dark-text text-sm focus:outline-none focus-ring-accent transition-colors">
                          <option value="user">{getI18nLabel('user.role.user', 'User')}</option>
                          <option value="admin">{getI18nLabel('user.role.admin', 'Admin')}</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder={optionalPasswordLabel} className="w-full bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded px-2 py-1 text-[#232333] dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors" />
                      </td>
                      <td className="px-4 py-3 text-[#6E7680] dark:text-dark-text-muted text-sm transition-colors">{formatDateTime(user.lastUpdated)}</td>
                      <td className="px-4 py-3 flex gap-2">
                        <button onClick={handleSaveEdit} className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/20 rounded transition-colors" title={t('userManagement.form.save')}><Save className="w-4 h-4" /></button>
                        <button onClick={handleCancelEdit} className="p-1 text-icon-muted dark:text-dark-text-muted hover:bg-surface hover:dark:bg-white/10 rounded transition-colors" title={t('userManagement.form.cancel')}><X className="w-4 h-4" /></button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-[#232333] dark:text-dark-text font-medium transition-colors">{user.firstName}</td>
                      <td className="px-4 py-3 text-[#232333] dark:text-dark-text font-medium transition-colors">{user.lastName}</td>
                      <td className="px-4 py-3 text-[#6E7680] dark:text-dark-text-muted transition-colors">{user.employeeId}</td>
                      <td className="px-4 py-3 text-[#6E7680] dark:text-dark-text-muted transition-colors">{getJobRoleLabel(user.userJobRole)}</td>
                      <td className="px-4 py-3 text-[#6E7680] dark:text-dark-text-muted transition-colors">{getAreaLabel(user.areaOfWork)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'} transition-colors`}>
                          {getI18nLabel(`user.role.${user.role}`, user.role === 'admin' ? 'Admin' : 'User')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#6E7680] dark:text-dark-text-muted transition-colors">••••••</td>
                      <td className="px-4 py-3 text-[#6E7680] dark:text-dark-text-muted text-sm transition-colors">{formatDateTime(user.lastUpdated)}</td>
                      <td className="px-4 py-3 flex gap-2">
                        <button onClick={() => handleEditUser(user.id)} className="p-1 text-blue-600 dark:text-dark-accent-blue hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded transition-colors" title={t('userManagement.form.edit')}><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteUser(user.id)} className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 rounded transition-colors" title={t('userManagement.form.delete')}><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface dark:bg-dark-surface border border-default dark:border-default rounded-2xl p-6 max-w-md w-full mx-4 space-y-4 shadow-xl transition-colors">
            <h3 className="text-xl font-semibold text-foreground dark:text-white transition-colors">{t('userManagement.form.addUserTitle')}</h3>

            <div className="space-y-3">
              <input type="text" placeholder={firstNameLabel} value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full bg-surface dark:bg-dark-surface-alt border border-default dark:border-default rounded-lg px-3 py-2 text-foreground dark:text-dark-text placeholder-muted dark:placeholder-dark-text-muted focus:outline-none focus-ring-accent transition-colors" />
              <input type="text" placeholder={lastNameLabel} value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full bg-surface dark:bg-dark-surface-alt border border-default dark:border-default rounded-lg px-3 py-2 text-foreground dark:text-dark-text placeholder-muted dark:placeholder-dark-text-muted focus:outline-none focus-ring-accent transition-colors" />
              <input type="text" placeholder={employeeIdLabel} value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} className="w-full bg-surface dark:bg-dark-surface-alt border border-default dark:border-default rounded-lg px-3 py-2 text-foreground dark:text-dark-text placeholder-muted dark:placeholder-dark-text-muted focus:outline-none focus-ring-accent transition-colors" />
              <select value={formData.userJobRole} onChange={(e) => setFormData({ ...formData, userJobRole: e.target.value })} className="w-full bg-surface dark:bg-dark-surface-alt border border-default dark:border-default rounded-lg px-3 py-2 text-foreground dark:text-dark-text focus:outline-none focus-ring-accent transition-colors">
                <option value="">{selectJobRoleLabel}</option>
                {JOB_ROLE_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>{getJobRoleLabel(option.key)}</option>
                ))}
              </select>
              <select value={formData.areaOfWork} onChange={(e) => setFormData({ ...formData, areaOfWork: e.target.value })} className="w-full bg-surface dark:bg-dark-surface-alt border border-default dark:border-default rounded-lg px-3 py-2 text-foreground dark:text-dark-text focus:outline-none focus-ring-accent transition-colors">
                <option value="">{selectAreaLabel}</option>
                {AREA_OF_WORK_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>{getAreaLabel(option.key)}</option>
                ))}
              </select>
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })} className="w-full bg-surface dark:bg-dark-surface-alt border border-default dark:border-default rounded-lg px-3 py-2 text-foreground dark:text-dark-text focus:outline-none focus-ring-accent transition-colors">
                <option value="user">{getI18nLabel('user.role.user', 'User')}</option>
                <option value="admin">{getI18nLabel('user.role.admin', 'Admin')}</option>
              </select>
              <input type="password" placeholder={passwordLabel} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full bg-surface dark:bg-dark-surface-alt border border-default dark:border-default rounded-lg px-3 py-2 text-foreground dark:text-dark-text placeholder-muted dark:placeholder-dark-text-muted focus:outline-none focus-ring-accent transition-colors" />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-default dark:border-default transition-colors">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg bg-surface dark:bg-dark-surface-alt hover:bg-surface-alt dark:hover:bg-dark-border text-foreground dark:text-dark-text text-sm font-medium transition-colors">{t('userManagement.form.cancel')}</button>
              <button onClick={handleSaveNewUser} className="px-4 py-2 rounded-lg btn-primary text-on-accent text-sm font-medium transition-colors">{t('userManagement.form.save')}</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface dark:bg-dark-surface border border-default dark:border-default rounded-2xl p-6 max-w-md w-full mx-4 space-y-4 shadow-xl transition-colors">
            <h3 className="text-xl font-semibold text-foreground dark:text-white transition-colors">{t('userManagement.delete.confirmTitle')}</h3>
            <p className="text-muted dark:text-dark-text-muted text-sm transition-colors">{t('userManagement.form.editUserTitle')}</p>

            <input type="password" placeholder={t('userManagement.delete.adminPassword')} value={editAdminPassword} onChange={(e) => setEditAdminPassword(e.target.value)} className="w-full bg-surface dark:bg-dark-surface-alt border border-default dark:border-default rounded-lg px-3 py-2 text-foreground dark:text-dark-text placeholder-muted dark:placeholder-dark-text-muted focus:outline-none focus-ring-accent transition-colors" />

            <div className="flex gap-3 justify-end pt-4 border-t border-default dark:border-default transition-colors">
              <button onClick={() => { setShowConfirmSave(false); setEditAdminPassword(''); }} className="px-4 py-2 rounded-lg bg-surface dark:bg-dark-surface-alt hover:bg-surface-alt dark:hover:bg-dark-border text-foreground dark:text-dark-text text-sm font-medium transition-colors">{t('userManagement.form.cancel')}</button>
              <button onClick={confirmSaveEdit} disabled={!editAdminPassword.trim()} className="px-4 py-2 rounded-lg btn-success text-on-accent text-sm font-medium transition-colors">{t('userManagement.form.save')}</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface dark:bg-dark-surface border border-default dark:border-default rounded-2xl p-6 max-w-md w-full mx-4 space-y-4 shadow-xl transition-colors">
            <h3 className="text-xl font-semibold text-foreground dark:text-white transition-colors">{t('userManagement.delete.adminPassword')}</h3>
            <p className="text-muted dark:text-dark-text-muted text-sm transition-colors">{t('userManagement.delete.confirmMessage')}</p>

            <input type="password" placeholder={t('userManagement.delete.adminPassword')} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="w-full bg-surface dark:bg-dark-surface-alt border border-default dark:border-default rounded-lg px-3 py-2 text-foreground dark:text-dark-text placeholder-muted dark:placeholder-dark-text-muted focus:outline-none focus-ring-accent transition-colors" />

            <div className="flex gap-3 justify-end pt-4 border-t border-default dark:border-default transition-colors">
              <button onClick={() => { setShowDeleteModal(false); setUserToDelete(null); setAdminPassword(''); }} className="px-4 py-2 rounded-lg bg-surface dark:bg-dark-surface-alt hover:bg-surface-alt dark:hover:bg-dark-border text-foreground dark:text-dark-text text-sm font-medium transition-colors">{t('userManagement.form.cancel')}</button>
              <button onClick={confirmDelete} disabled={!adminPassword.trim()} className="px-4 py-2 rounded-lg btn-danger disabled:opacity-50 disabled:cursor-not-allowed text-on-accent text-sm font-medium transition-colors">{t('userManagement.delete.confirmButton')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
