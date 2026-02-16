/**
 * RBAC Middleware - Aviary Authorization Integration
 * Enforces role-based access control on API endpoints
 */

import { Context, Next } from 'koa';
import identityService from '../services/identityService';

/**
 * Authentication middleware - verifies JWT token
 */
export const authMiddleware = async (ctx: Context, next: Next) => {
  try {
    // Skip auth for whitelisted endpoints
    const whitelistPaths = [
      '/user/login',
      '/user/logout',
      '/user/register',
      '/user/captchaImage',
      '/user/auth/callback',
      '/user/auth/exchange',
      '/auth/login',
      '/auth/register',
      '/auth/captcha',
      '/auth/verify',
      '/health',
      '/api/health',
    ];

    if (whitelistPaths.includes(ctx.path) || ctx.path.startsWith('/auth/')) {
      return next();
    }

    // Get token from header
    const token = ctx.header.authorization?.replace('Bearer ', '');
    if (!token) {
      ctx.status = 401;
      ctx.body = {
        code: 401,
        msg: 'ログインしてください',
        data: null,
      };
      return;
    }

    // Verify token
    const decoded = await identityService.verifyToken(token);
    if (!decoded) {
      ctx.status = 401;
      ctx.body = {
        code: 401,
        msg: 'トークンが無効または期限切れです',
        data: null,
      };
      return;
    }

    // Attach user to context
    ctx.user = decoded;
    ctx.userId = decoded.userId;
    ctx.userName = decoded.userName;

    // Get full user context
    const user = await identityService.getUserById(decoded.userId);
    if (!user) {
      ctx.status = 401;
      ctx.body = {
        code: 401,
        msg: 'ユーザーが見つかりません',
        data: null,
      };
      return;
    }

    ctx.authContext = {
      user,
      roles: (user as any).roles || [],
      permissions: (user as any).permissions || [],
      menus: (user as any).menus || [],
      dept: (user as any).dept || null,
    };

    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      msg: '認証エラーが発生しました',
      data: null,
    };
  }
};

/**
 * Permission check middleware factory
 * @param requiredPermission - Permission code to check
 */
export const requirePermission = (requiredPermission: string) => {
  return async (ctx: Context, next: Next) => {
    try {
      const userId = ctx.userId as number;
      if (!userId) {
        ctx.status = 401;
        ctx.body = {
          code: 401,
          msg: 'ログインしてください',
          data: null,
        };
        return;
      }

      const hasPermission = await identityService.hasPermission(userId, requiredPermission);
      if (!hasPermission) {
        ctx.status = 403;
        ctx.body = {
          code: 403,
          msg: '権限がありません',
          data: null,
        };
        return;
      }

      return next();
    } catch (error) {
      console.error('Permission check error:', error);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        msg: '権限チェックエラーが発生しました',
        data: null,
      };
    }
  };
};

/**
 * Role check middleware factory
 * @param requiredRole - Role code to check
 */
export const requireRole = (requiredRole: string) => {
  return async (ctx: Context, next: Next) => {
    try {
      const userId = ctx.userId as number;
      if (!userId) {
        ctx.status = 401;
        ctx.body = {
          code: 401,
          msg: 'ログインしてください',
          data: null,
        };
        return;
      }

      const hasRole = await identityService.hasRole(userId, requiredRole);
      if (!hasRole) {
        ctx.status = 403;
        ctx.body = {
          code: 403,
          msg: '権限がありません',
          data: null,
        };
        return;
      }

      return next();
    } catch (error) {
      console.error('Role check error:', error);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        msg: 'ロールチェックエラーが発生しました',
        data: null,
      };
    }
  };
};

/**
 * Department scope middleware - restrict access based on department
 */
export const departmentScope = async (ctx: Context, next: Next) => {
  try {
    const userId = ctx.userId as number;
    if (!userId) {
      ctx.status = 401;
      ctx.body = {
        code: 401,
        msg: 'ログインしてください',
        data: null,
      };
      return;
    }

    const user = await identityService.getUserById(userId);
    if (!user) {
      ctx.status = 401;
      ctx.body = {
        code: 401,
        msg: 'ユーザーが見つかりません',
        data: null,
      };
      return;
    }

    // Attach dept scope info
    ctx.deptId = user.deptId;
    ctx.dept = (user as any).dept;

    return next();
  } catch (error) {
    console.error('Department scope error:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      msg: '部門スコープエラーが発生しました',
      data: null,
    };
  }
};

/**
 * Admin only middleware
 */
export const adminOnly = async (ctx: Context, next: Next) => {
  try {
    const userId = ctx.userId as number;
    if (!userId) {
      ctx.status = 401;
      ctx.body = {
        code: 401,
        msg: 'ログインしてください',
        data: null,
      };
      return;
    }

    const isAdmin = await identityService.hasRole(userId, 'admin');
    if (!isAdmin) {
      ctx.status = 403;
      ctx.body = {
        code: 403,
        msg: '管理者権限が必要です',
        data: null,
      };
      return;
    }

    return next();
  } catch (error) {
    console.error('Admin check error:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      msg: '管理者チェックエラーが発生しました',
      data: null,
    };
  }
};

/**
 * Check if user owns resource (for personal data)
 */
export const checkResourceOwnership = (resourceUserIdField: string = 'userId') => {
  return async (ctx: Context, next: Next) => {
    try {
      const userId = ctx.userId as number;
      if (!userId) {
        ctx.status = 401;
        ctx.body = {
          code: 401,
          msg: 'ログインしてください',
          data: null,
        };
        return;
      }

      const resourceUserId = (ctx.request.body as any)?.[resourceUserIdField];
      if (resourceUserId && resourceUserId !== userId) {
        // Check if user is admin (can edit others)
        const isAdmin = await identityService.hasRole(userId, 'admin');
        if (!isAdmin) {
          ctx.status = 403;
          ctx.body = {
            code: 403,
            msg: 'このリソースを変更する権限がありません',
            data: null,
          };
          return;
        }
      }

      return next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        msg: 'リソースチェックエラーが発生しました',
        data: null,
      };
    }
  };
};

/**
 * Rate limiting middleware (optional)
 */
export const rateLimit = (maxRequests: number = 100, windowMs: number = 60000) => {
  const requests = new Map<string, number[]>();

  return async (ctx: Context, next: Next) => {
    const key = ctx.ip;
    const now = Date.now();

    if (!requests.has(key)) {
      requests.set(key, []);
    }

    const timestamps = requests.get(key)!;
    const recentRequests = timestamps.filter(t => now - t < windowMs);

    if (recentRequests.length >= maxRequests) {
      ctx.status = 429;
      ctx.body = {
        code: 429,
        msg: 'リクエストが多すぎます。後でもう一度お試しください',
        data: null,
      };
      return;
    }

    recentRequests.push(now);
    requests.set(key, recentRequests);

    return next();
  };
};

export default {
  authMiddleware,
  requirePermission,
  requireRole,
  departmentScope,
  adminOnly,
  checkResourceOwnership,
  rateLimit,
};
