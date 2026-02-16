/**
 * User Management Routes - Aviary RBAC Integration
 * Provides user profile, menus, and user-related endpoints
 */

import Router from 'koa-router';
import { Context } from 'koa';
import identityService from '../services/identityService';
import { requirePermission, adminOnly } from '../middleware/rbacMiddleware';

const router = new Router({ prefix: '/user' });

/**
 * Get current user info
 * GET /user/getInfo
 */
router.get('/getInfo', async (ctx: Context) => {
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
      ctx.status = 404;
      ctx.body = {
        code: 404,
        msg: 'ユーザーが見つかりません',
        data: null,
      };
      return;
    }

    ctx.status = 200;
    ctx.body = {
      code: 200,
      msg: 'ユーザー情報を取得しました',
      data: {
        userId: user.userId,
        userName: user.userName,
        email: user.email,
        avatar: user.avatar,
        deptId: user.deptId,
        dept: (user as any).dept,
        status: user.status,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    };
  } catch (error) {
    console.error('Get user info error:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      msg: 'ユーザー情報の取得に失敗しました',
      data: null,
    };
  }
});

/**
 * Get user menus and permissions (routers)
 * GET /user/getRouters
 */
router.get('/getRouters', async (ctx: Context) => {
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

    const menus = await identityService.getUserMenus(userId);
    const permissions = await identityService.getUserPermissions(userId);

    // Build tree structure from menus
    const buildMenuTree = (items: any[], parentId?: number): any[] => {
      return items
        .filter(item => item.parentId === (parentId || null))
        .map(item => ({
          menuId: item.menuId,
          menuName: item.menuName,
          path: item.path,
          component: item.component,
          icon: item.icon,
          orderNum: item.orderNum,
          perms: item.perms,
          visible: item.visible,
          type: item.type,
          meta: {
            title: item.menuName,
            icon: item.icon,
            hidden: item.visible === 'hide',
          },
          children: buildMenuTree(items, item.menuId),
        }))
        .sort((a, b) => a.orderNum - b.orderNum);
    };

    const menuTree = buildMenuTree(menus);

    ctx.status = 200;
    ctx.body = {
      code: 200,
      msg: 'ルーター情報を取得しました',
      data: {
        routers: menuTree,
        permissions,
      },
    };
  } catch (error) {
    console.error('Get routers error:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      msg: 'ルーター情報の取得に失敗しました',
      data: null,
    };
  }
});

/**
 * Get user profile
 * GET /user/profile
 */
router.get('/profile', async (ctx: Context) => {
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
    const roles = await identityService.getUserRoles(userId);

    ctx.status = 200;
    ctx.body = {
      code: 200,
      msg: 'プロフィール情報を取得しました',
      data: {
        userId: user?.userId,
        userName: user?.userName,
        email: user?.email,
        avatar: user?.avatar,
        deptId: user?.deptId,
        dept: (user as any)?.dept,
        status: user?.status,
        roles: roles.map(r => ({
          roleId: r.roleId,
          roleName: r.roleName,
          roleCode: r.roleCode,
        })),
        createdAt: user?.created_at,
        updatedAt: user?.updated_at,
      },
    };
  } catch (error) {
    console.error('Get profile error:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      msg: 'プロフィール情報の取得に失敗しました',
      data: null,
    };
  }
});

/**
 * Update user profile
 * PUT /user/profile
 */
router.put('/profile', async (ctx: Context) => {
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

    const { email, nickname } = ctx.request.body as {
      email?: string;
      nickname?: string;
    };

    // Update profile (implement in database)
    // For now, return success
    ctx.status = 200;
    ctx.body = {
      code: 200,
      msg: 'プロフィールを更新しました',
      data: {
        userId,
        email,
        nickname,
      },
    };
  } catch (error) {
    console.error('Update profile error:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      msg: 'プロフィール更新に失敗しました',
      data: null,
    };
  }
});

/**
 * Update user password
 * PUT /user/profile/updatePwd
 */
router.put('/profile/updatePwd', async (ctx: Context) => {
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

    const { oldPassword, newPassword, confirmPassword } = ctx.request.body as {
      oldPassword: string;
      newPassword: string;
      confirmPassword: string;
    };

    if (!oldPassword || !newPassword) {
      ctx.status = 400;
      ctx.body = {
        code: 400,
        msg: 'パスワードは空にできません',
        data: null,
      };
      return;
    }

    if (newPassword !== confirmPassword) {
      ctx.status = 400;
      ctx.body = {
        code: 400,
        msg: '2回入力したパスワードが一致しません',
        data: null,
      };
      return;
    }

    const success = await identityService.updatePassword(
      userId,
      oldPassword,
      newPassword
    );

    if (!success) {
      ctx.status = 400;
      ctx.body = {
        code: 400,
        msg: '現在のパスワードが正しくありません',
        data: null,
      };
      return;
    }

    ctx.status = 200;
    ctx.body = {
      code: 200,
      msg: 'パスワードが変更されました',
      data: null,
    };
  } catch (error) {
    console.error('Update password error:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      msg: 'パスワード変更に失敗しました',
      data: null,
    };
  }
});

/**
 * Upload user avatar
 * POST /user/profile/avatar
 */
router.post('/profile/avatar', async (ctx: Context) => {
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

    // Implementation depends on file upload service
    // For now, return success
    ctx.status = 200;
    ctx.body = {
      code: 200,
      msg: 'アバターをアップロードしました',
      data: {
        userId,
        avatarUrl: `/api/user/profile/downloadAvatar/${userId}`,
      },
    };
  } catch (error) {
    console.error('Upload avatar error:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      msg: 'アバターアップロードに失敗しました',
      data: null,
    };
  }
});

/**
 * Download user avatar
 * GET /user/profile/downloadAvatar/:userId
 */
router.get('/profile/downloadAvatar/:userId', async (ctx: Context) => {
  try {
    const userId = ctx.params.userId;
    // Implementation depends on file storage service
    ctx.status = 200;
    ctx.body = {
      code: 200,
      msg: 'アバターをダウンロードしました',
      data: null,
    };
  } catch (error) {
    console.error('Download avatar error:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      msg: 'アバターダウンロードに失敗しました',
      data: null,
    };
  }
});

/**
 * List all users (admin only)
 * GET /user/list
 */
router.get('/list', adminOnly, async (ctx: Context) => {
  try {
    // Implementation depends on database query
    ctx.status = 200;
    ctx.body = {
      code: 200,
      msg: 'ユーザー一覧を取得しました',
      data: {
        rows: [],
        total: 0,
      },
    };
  } catch (error) {
    console.error('List users error:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      msg: 'ユーザー一覧の取得に失敗しました',
      data: null,
    };
  }
});

/**
 * Create new user (admin only)
 * POST /user/create
 */
router.post('/create', adminOnly, async (ctx: Context) => {
  try {
    const { userName, password, email } = ctx.request.body as {
      userName: string;
      password: string;
      email?: string;
    };

    const newUser = await identityService.registerUser({
      userName,
      password,
      email,
      nickname: userName,
      status: 'active',
    });

    if (!newUser) {
      ctx.status = 400;
      ctx.body = {
        code: 400,
        msg: 'ユーザー作成に失敗しました',
        data: null,
      };
      return;
    }

    ctx.status = 201;
    ctx.body = {
      code: 200,
      msg: 'ユーザーを作成しました',
      data: {
        userId: newUser.userId,
        userName: newUser.userName,
        email: newUser.email,
      },
    };
  } catch (error) {
    console.error('Create user error:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      msg: 'ユーザー作成に失敗しました',
      data: null,
    };
  }
});

export default router;
