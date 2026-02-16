# UI Integration Guide - Aviary RBAC System

## Overview

This guide explains how to integrate the Frontend/UI with the new Aviary RBAC authentication and authorization system in the QA Bot API.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install axios jwt-decode
# or
pnpm add axios jwt-decode
```

### 2. Create Auth Service
```typescript
// src/services/authService.ts
import axios from 'axios';
import jwtDecode from 'jwt-decode';

const API_BASE = 'http://localhost:3000';

export interface AuthToken {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface User {
  userId: number;
  userName: string;
  email?: string;
  avatar?: string;
  dept?: string;
  roles: Array<{ roleId: number; roleName: string; roleCode: string }>;
  permissions: string[];
}

export interface AuthResponse {
  code: number;
  msg: string;
  data: {
    token: string;
    tokenType: string;
    expiresIn: number;
    user: User;
  };
}

class AuthService {
  private tokenKey = 'auth_token';
  private userKey = 'auth_user';

  /**
   * Get stored token
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Get stored user
   */
  getUser(): User | null {
    const user = localStorage.getItem(this.userKey);
    return user ? JSON.parse(user) : null;
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const decoded: any = jwtDecode(token);
      const expiryTime = decoded.exp * 1000;
      return Date.now() >= expiryTime;
    } catch {
      return true;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken() && !this.isTokenExpired();
  }

  /**
   * Login user
   */
  async login(userName: string, password: string): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(
      `${API_BASE}/auth/login`,
      { userName, password }
    );

    if (response.data.code === 200) {
      localStorage.setItem(this.tokenKey, response.data.data.token);
      localStorage.setItem(this.userKey, JSON.stringify(response.data.data.user));
    }

    return response.data;
  }

  /**
   * Register new user
   */
  async register(
    userName: string,
    password: string,
    confirmPassword: string,
    email?: string
  ): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(
      `${API_BASE}/auth/register`,
      { userName, password, confirmPassword, email }
    );

    return response.data;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        await axios.post(
          `${API_BASE}/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  /**
   * Refresh token
   */
  async refreshToken(): Promise<AuthToken | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const response = await axios.post<{
        code: number;
        msg: string;
        data: AuthToken;
      }>(
        `${API_BASE}/auth/refresh`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.code === 200) {
        localStorage.setItem(this.tokenKey, response.data.data.accessToken);
        return response.data.data;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      this.logout();
    }

    return null;
  }

  /**
   * Get user menus and permissions
   */
  async getRouters(): Promise<{
    routers: any[];
    permissions: string[];
  } | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const response = await axios.get(
        `${API_BASE}/user/getRouters`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.code === 200) {
        return response.data.data;
      }
    } catch (error) {
      console.error('Get routers error:', error);
    }

    return null;
  }

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<User | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const response = await axios.get(
        `${API_BASE}/user/profile`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.code === 200) {
        return response.data.data;
      }
    } catch (error) {
      console.error('Get profile error:', error);
    }

    return null;
  }

  /**
   * Update password
   */
  async updatePassword(
    oldPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ code: number; msg: string }> {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');

    const response = await axios.put(
      `${API_BASE}/auth/password`,
      { oldPassword, newPassword, confirmPassword },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return { code: response.data.code, msg: response.data.msg };
  }

  /**
   * Check permission
   */
  hasPermission(permission: string): boolean {
    const user = this.getUser();
    if (!user) return false;

    return (
      user.permissions.includes(permission) ||
      user.permissions.includes('*')
    );
  }

  /**
   * Check role
   */
  hasRole(roleCode: string): boolean {
    const user = this.getUser();
    if (!user) return false;

    return user.roles.some(r => r.roleCode === roleCode);
  }
}

export default new AuthService();
```

### 3. Create Axios Interceptor
```typescript
// src/services/apiClient.ts
import axios from 'axios';
import authService from './authService';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 10000,
});

// Request interceptor
apiClient.interceptors.request.use(
  config => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // Handle token expiry
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      error.response?.data?.msg?.includes('expired')
    ) {
      originalRequest._retry = true;

      const newToken = await authService.refreshToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken.accessToken}`;
        return apiClient(originalRequest);
      } else {
        // Redirect to login
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## Login Page Implementation

### React Example
```typescript
// src/pages/Login.tsx
import React, { useState } from 'react';
import authService from '@/services/authService';
import { useNavigate } from 'react-router-dom';

export const Login: React.FC = () => {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.login(userName, password);

      if (response.code === 200) {
        // Login successful
        navigate('/dashboard');
      } else {
        setError(response.msg);
      }
    } catch (err: any) {
      setError(err.response?.data?.msg || 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h1>ログイン</h1>

        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label>ユーザー名</label>
          <input
            type="text"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>パスワード</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'ロギング中...' : 'ログイン'}
        </button>

        <p>
          アカウントをお持ちでない場合は{' '}
          <a href="/register">登録</a>してください
        </p>
      </form>
    </div>
  );
};
```

---

## Protected Route Component

### React Router Example
```typescript
// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '@/services/authService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredRole,
}) => {
  // Check authentication
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" />;
  }

  // Check permission
  if (requiredPermission && !authService.hasPermission(requiredPermission)) {
    return <Navigate to="/forbidden" />;
  }

  // Check role
  if (requiredRole && !authService.hasRole(requiredRole)) {
    return <Navigate to="/forbidden" />;
  }

  return <>{children}</>;
};
```

---

## Navigation Based on Permissions

### Dynamic Menu Example
```typescript
// src/components/Navigation.tsx
import React, { useEffect, useState } from 'react';
import authService from '@/services/authService';

interface MenuItem {
  menuId: number;
  menuName: string;
  path: string;
  icon?: string;
  children?: MenuItem[];
}

export const Navigation: React.FC = () => {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMenus = async () => {
      const routers = await authService.getRouters();
      if (routers) {
        setMenus(routers.routers);
      }
      setLoading(false);
    };

    loadMenus();
  }, []);

  if (loading) return <div>読み込み中...</div>;

  const renderMenus = (items: MenuItem[]) => (
    <ul>
      {items.map(item => (
        <li key={item.menuId}>
          <a href={item.path}>
            {item.icon && <i className={`icon-${item.icon}`}></i>}
            <span>{item.menuName}</span>
          </a>
          {item.children && item.children.length > 0 && (
            renderMenus(item.children)
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <nav className="navigation">
      {renderMenus(menus)}
    </nav>
  );
};
```

---

## API Request with Token

### Example: Get Escalation List
```typescript
// src/services/escalationService.ts
import apiClient from './apiClient';

export const getEscalations = async (departmentId: number) => {
  try {
    const response = await apiClient.get(
      `/api/escalation/list?departmentId=${departmentId}`
    );

    if (response.data.code === 200) {
      return response.data.data;
    } else {
      throw new Error(response.data.msg);
    }
  } catch (error) {
    console.error('Failed to fetch escalations:', error);
    throw error;
  }
};

export const resolveEscalation = async (
  escalationId: number,
  notes: string
) => {
  try {
    const response = await apiClient.put(
      `/api/escalation/${escalationId}/resolve`,
      { resolution_notes: notes }
    );

    if (response.data.code === 200) {
      return response.data.data;
    } else {
      throw new Error(response.data.msg);
    }
  } catch (error) {
    console.error('Failed to resolve escalation:', error);
    throw error;
  }
};
```

---

## Error Handling

### Standardized Error Handler
```typescript
// src/utils/errorHandler.ts
import { AxiosError } from 'axios';

export const handleApiError = (error: AxiosError<any>) => {
  const data = error.response?.data;

  switch (error.response?.status) {
    case 400:
      return `入力エラー: ${data?.msg || 'リクエストが無効です'}`;

    case 401:
      return `認証エラー: ${data?.msg || 'ログインしてください'}`;

    case 403:
      return `アクセス拒否: ${data?.msg || '権限がありません'}`;

    case 404:
      return `見つかりません: ${data?.msg || 'リソースが見つかりません'}`;

    case 429:
      return 'リクエストが多すぎます。後でもう一度お試しください';

    case 500:
      return `サーバーエラー: ${data?.msg || 'サーバーで問題が発生しました'}`;

    default:
      return `エラー: ${data?.msg || 'エラーが発生しました'}`;
  }
};
```

---

## User Profile Management

### User Profile Component
```typescript
// src/components/UserProfile.tsx
import React, { useEffect, useState } from 'react';
import authService from '@/services/authService';
import { User } from '@/services/authService';

export const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const profile = await authService.getUserProfile();
      setUser(profile);
    };

    loadProfile();
  }, []);

  const handleChangePassword = async (
    oldPassword: string,
    newPassword: string
  ) => {
    try {
      await authService.updatePassword(
        oldPassword,
        newPassword,
        newPassword
      );
      alert('パスワードが変更されました');
      setShowPassword(false);
    } catch (error: any) {
      alert(error.response?.data?.msg || 'パスワード変更に失敗しました');
    }
  };

  if (!user) return <div>読み込み中...</div>;

  return (
    <div className="user-profile">
      <div className="profile-header">
        {user.avatar && (
          <img src={user.avatar} alt={user.userName} className="avatar" />
        )}
        <div>
          <h2>{user.userName}</h2>
          <p>{user.email}</p>
        </div>
      </div>

      <div className="profile-details">
        <p>
          <strong>部門:</strong> {user.dept}
        </p>
        <p>
          <strong>ロール:</strong>{' '}
          {user.roles.map(r => r.roleName).join(', ')}
        </p>
      </div>

      {showPassword && (
        <div className="password-form">
          <h3>パスワード変更</h3>
          {/* Password form implementation */}
        </div>
      )}

      <button onClick={() => setShowPassword(!showPassword)}>
        パスワードを変更
      </button>

      <button onClick={() => authService.logout()}>ログアウト</button>
    </div>
  );
};
```

---

## Permission Check Component

### Conditional Rendering
```typescript
// src/components/PermissionGuard.tsx
import React from 'react';
import authService from '@/services/authService';

interface PermissionGuardProps {
  permission?: string;
  role?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  role,
  children,
  fallback = null,
}) => {
  const hasAccess =
    (!permission || authService.hasPermission(permission)) &&
    (!role || authService.hasRole(role));

  return <>{hasAccess ? children : fallback}</>;
};

// Usage
<PermissionGuard permission="escalation:manage">
  <button onClick={handleResolveEscalation}>
    エスカレーション解決
  </button>
</PermissionGuard>

<PermissionGuard role="admin" fallback={<p>権限がありません</p>}>
  <button onClick={handleDeleteUser}>ユーザーを削除</button>
</PermissionGuard>
```

---

## Best Practices

### 1. Token Storage
```typescript
// Secure token storage
- Use httpOnly cookies for maximum security (backend can set)
- Use localStorage for convenience (may be exposed to XSS)
- Never store in plain text
- Clear on logout

// localStorage example
localStorage.setItem('auth_token', token);
localStorage.removeItem('auth_token'); // on logout
```

### 2. Token Refresh
```typescript
// Auto refresh before expiry
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes

const shouldRefreshToken = () => {
  const token = authService.getToken();
  // Check if expires within buffer time
};

// Setup refresh interval
setInterval(() => {
  if (shouldRefreshToken()) {
    authService.refreshToken();
  }
}, 60 * 1000); // Check every minute
```

### 3. Error Handling
```typescript
// Handle auth errors gracefully
- Display user-friendly messages
- Log detailed errors for debugging
- Redirect to login on 401
- Show permission denied on 403
- Retry on 429 with backoff
```

### 4. Loading States
```typescript
// Show loading indicator during auth operations
- Disable buttons while loading
- Show spinner or skeleton loader
- Prevent double submission
- Handle network timeouts
```

### 5. Logout Handling
```typescript
// Complete logout flow
1. Call /auth/logout endpoint
2. Clear tokens from storage
3. Clear user context
4. Clear route data
5. Redirect to login
6. Clear axios interceptors
```

---

## Testing

### Unit Test Example
```typescript
// src/services/authService.test.ts
import { describe, it, expect } from 'vitest';
import authService from './authService';

describe('AuthService', () => {
  it('should login successfully', async () => {
    const response = await authService.login('testuser', 'password');
    expect(response.code).toBe(200);
    expect(authService.isAuthenticated()).toBe(true);
  });

  it('should logout', async () => {
    await authService.logout();
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('should check permissions', () => {
    // Setup user with permissions
    const hasPermission = authService.hasPermission('escalation:view');
    expect(hasPermission).toBe(true);
  });
});
```

---

## Troubleshooting

### Issue: "Not authenticated" on protected routes
**Solution**:
- Verify token is stored correctly
- Check token hasn't expired
- Verify JWT_SECRET matches backend
- Clear localStorage and re-login

### Issue: "Permission denied" on all endpoints
**Solution**:
- Verify user roles are assigned
- Check role has required permission
- Verify permission code matches
- Check department scope

### Issue: CORS errors
**Solution**:
- Verify API_BASE URL is correct
- Check backend CORS configuration
- Ensure credentials are sent if required
- Check proxy configuration

---

## Summary

The UI integration with Aviary RBAC requires:

1. ✅ Auth service for token management
2. ✅ Axios interceptor for automatic token injection
3. ✅ Protected routes for access control
4. ✅ Dynamic menus based on permissions
5. ✅ Error handling for auth failures
6. ✅ User profile management
7. ✅ Permission guards for conditional rendering

All of these components are provided in this guide and ready to implement.
