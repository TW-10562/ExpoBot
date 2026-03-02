import { IuserTokenType } from '@/types';
import {
  addSession,
  judgeKeyOverdue,
  queryKeyValue,
  removeListKey,
  resetTime,
} from '@/utils/auth';
import { getSetsValue, removeSetKeys } from '@/utils/redis';
import { getFullUserInfo } from '@/utils/userInfo';
import Role from '@/mysql/model/role.model';
import UserRole from '@/mysql/model/user_role.model';
import jwt from 'jsonwebtoken';
import { Context } from 'koa';
import { config } from '@config/index';

export const authWhites = [
  '/health',
  '/user/login',
  '/api/user/login',
  '/user/logout',
  '/api/user/logout',
  '/user/register',
  '/api/user/register',
  '/user/captchaImage',
  '/system/config/configKey',
  '/system/menu/list',
  '/group/list',
  '/user/auth/callback',
  '/user/auth/exchange',
  '/api/gen-task',
  '/api/user/auth/callback',
  '/api/user/auth/exchange',
  '/api/auth/login',
];

export const auth = async (ctx: Context, next: () => Promise<void>) => {
  const authorization = ctx.request.header.authorization || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : '';

  const uri = ctx.request.url.split('?')[0];

  if (!authWhites.includes(uri)) {
    if (!token) {
      return ctx.app.emit(
        'error',
        { code: '401', message: '無効なトークン' },
        ctx,
      );
    }

    try {
      const user = jwt.verify(token, config.Backend.jwtSecret) as IuserTokenType;

      const valid = await judgeKeyOverdue(user.session);
      if (!valid) {
        await removeListKey([user.session]);
        return ctx.app.emit(
          'error',
          { code: '401', message: '無効なトークン' },
          ctx,
        );
      }

      resetTime(user.session);

      if ((await getSetsValue('update_userInfo')).includes(String(user.userId))) {
        const userData = await queryKeyValue(user.session);
        const latest = await getFullUserInfo(user.userId);

        await addSession(user.session, {
          ...userData,
          loginTime: new Date().toLocaleString(config.Backend.logTime),
          ...latest,
        });

        await removeSetKeys('update_userInfo', [String(user.userId)]);
      }

      ctx.state.user = user;
    } catch (err) {
      return ctx.app.emit(
        'error',
        { code: '401', message: '無効なトークン' },
        ctx,
      );
    }
  }

  await next();
};

export const usePermission =
  (permission: string) => async (ctx: Context, next: () => Promise<void>) => {
    const { session } = ctx.state.user || {};
    const data = await queryKeyValue(session);
    const permissions = data?.permissions || [];

    if (permissions[0] !== '*|*') {
      const type =
        ctx.request.method === 'POST'
          ? ctx.request.body?.type
          : ctx.query?.type;

      if (type) {
        if (!permissions.includes(`${permission}|${type}`)) {
          return ctx.app.emit(
            'error',
            { code: '403', message: 'アクセス権限がありません' },
            ctx,
          );
        }
      } else if (!permissions.includes(permission)) {
        return ctx.app.emit(
          'error',
          { code: '403', message: 'アクセス権限がありません' },
          ctx,
        );
      }
    }

    await next();
  };

export const requireAdmin = async (ctx: Context, next: () => Promise<void>) => {
  const userId = Number(ctx.state.user?.userId);
  if (!Number.isFinite(userId)) {
    return ctx.app.emit(
      'error',
      { code: '401', message: '無効なトークン' },
      ctx,
    );
  }

  const adminRole = (await Role.findOne({
    raw: true,
    attributes: ['role_id'],
    where: { role_key: 'admin', del_flag: '0' },
  })) as any;

  if (!adminRole?.role_id) {
    return ctx.app.emit(
      'error',
      { code: '403', message: 'アクセス権限がありません' },
      ctx,
    );
  }

  const userAdmin = (await UserRole.findOne({
    raw: true,
    where: { user_id: userId, role_id: adminRole.role_id },
  })) as any;

  if (!userAdmin) {
    return ctx.app.emit(
      'error',
      { code: '403', message: 'アクセス権限がありません' },
      ctx,
    );
  }

  await next();
};
