import { useState } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, X, Save } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  userJobRole: string;
  areaOfWork: string;
  role: 'admin' | 'user';
  username: string;
  password: string;
  lastUpdated: Date;
}

interface FormData {
  firstName: string;
  lastName: string;
  employeeId: string;
  userJobRole: string;
  areaOfWork: string;
  role: 'admin' | 'user';
  username: string;
  password: string;
}

const mockUsers: User[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    employeeId: 'EMP001',
    userJobRole: 'Developer',
    areaOfWork: 'Engineering',
    role: 'user',
    username: 'johndoe',
    password: 'pass123',
    lastUpdated: new Date(2024, 0, 15),
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    employeeId: 'EMP002',
    userJobRole: 'Manager',
    areaOfWork: 'HR',
    role: 'admin',
    username: 'janesmith',
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
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    employeeId: '',
    userJobRole: '',
    areaOfWork: '',
    role: 'user',
    username: '',
    password: '',
  });
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');

  const handleAddUser = () => {
    setFormData({
      firstName: '',
      lastName: '',
      employeeId: '',
      userJobRole: '',
      areaOfWork: '',
      role: 'user',
      username: '',
      password: '',
    });
    setShowAddModal(true);
  };

  const handleSaveNewUser = () => {
    if (!formData.firstName || !formData.lastName || !formData.username) {
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
      username: '',
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
        username: user.username,
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
        username: '',
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
      username: '',
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
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-[#232333] dark:text-white transition-colors">
          {t('userManagement.title')}
        </h3>
        {!editingUser && (
          <button
            onClick={handleAddUser}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1d2089] hover:bg-[#161870] dark:bg-dark-accent-blue dark:hover:bg-[#3b82f6] text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('userManagement.form.addUserTitle')}
          </button>
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
                {t('userManagement.table.username')}
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
                <td colSpan={10} className="px-4 py-8 text-center text-[#6E7680] dark:text-dark-text-muted transition-colors">
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
                        <input
                          type="text"
                          value={formData.userJobRole}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              userJobRole: e.target.value,
                            })
                          }
                          className="w-full bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded px-2 py-1 text-[#232333] dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={formData.areaOfWork}
                          onChange={(e) =>
                            setFormData({ ...formData, areaOfWork: e.target.value })
                          }
                          className="w-full bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded px-2 py-1 text-[#232333] dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors"
                        />
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
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) =>
                            setFormData({ ...formData, username: e.target.value })
                          }
                          className="w-full bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded px-2 py-1 text-[#232333] dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors"
                        />
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
                        {user.userJobRole}
                      </td>
                      <td className="px-4 py-3 text-[#6E7680] dark:text-dark-text-muted transition-colors">
                        {user.areaOfWork}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          } transition-colors`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#6E7680] dark:text-dark-text-muted transition-colors">{user.username}</td>
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
              <input
                type="text"
                placeholder={t('userManagement.table.userJobRole')}
                value={formData.userJobRole}
                onChange={(e) =>
                  setFormData({ ...formData, userJobRole: e.target.value })
                }
                className="w-full bg-white dark:bg-dark-surface-alt border border-[#E8E8E8] dark:border-dark-border rounded-lg px-3 py-2 text-[#232333] dark:text-dark-text placeholder-[#9CA3AF] dark:placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors"
              />
              <input
                type="text"
                placeholder={t('userManagement.table.areaOfWork')}
                value={formData.areaOfWork}
                onChange={(e) =>
                  setFormData({ ...formData, areaOfWork: e.target.value })
                }
                className="w-full bg-white dark:bg-dark-surface-alt border border-[#E8E8E8] dark:border-dark-border rounded-lg px-3 py-2 text-[#232333] dark:text-dark-text placeholder-[#9CA3AF] dark:placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors"
              />
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
                <option value="user">{t('userManagement.table.role')}: User</option>
                <option value="admin">{t('userManagement.table.role')}: Admin</option>
              </select>
              <input
                type="text"
                placeholder={t('userManagement.table.username')}
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="w-full bg-white dark:bg-dark-surface-alt border border-[#E8E8E8] dark:border-dark-border rounded-lg px-3 py-2 text-[#232333] dark:text-dark-text placeholder-[#9CA3AF] dark:placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-dark-accent-blue transition-colors"
              />
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
