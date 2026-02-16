import { IuserTokenType } from '@/types';
import { addSession, judgeKeyOverdue, queryKeyValue, removeListKey, resetTime } from '@/utils/auth';
import { getSetsValue, removeSetKeys } from '@/utils/redis';
import { getFullUserInfo } from '@/utils/userInfo';
import FileRole from '@/mysql/model/file_role.model';
import { getUserRoleSer } from '@/service/user';
import jwt from 'jsonwebtoken';
import { Context } from 'koa';
import { config } from '@config/index'
import { Op } from 'sequelize';
import { matchesPermission } from '@/utils/permissionResolver';

export const authWhites = [
  '/user/login',
  '/user/logout',
  '/user/register',
  '/user/captchaImage',
  '/system/config/configKey',
  'system/menu/list',
  '/group/list',
  '/group/populate-test-data',
  '/api/files/extract-text',
  '/api/gen-task',  // Allow chat endpoint for testing
  '/api/gen-task/translate-on-demand',  // Allow translation endpoint
  '/user/auth/callback',
  '/user/auth/exchange',
  // Support and messaging endpoints
  '/api/support/ticket',
  '/api/support/notifications',
  '/api/support/notifications/count',
  '/api/messages/send',
  '/api/messages/broadcast',
  '/api/messages/inbox',
  '/api/messages/unread-count',
  '/api/health',
];

export const auth = async (ctx: Context, next: () => Promise<void>) => {
  const { authorization = '' } = ctx.request.header;
  const token = authorization.replace('Bearer ', '');

  const uri = ctx.request.url.split('?')[0];

  if (!authWhites.includes(uri)) {
    // TODO: Not all of the config values is using the new config management system
    //       We need refactor the whole project to use the new config management system
    try {
      const user = jwt.verify(token, config.Backend.jwtSecret) as IuserTokenType;

      if (!(await judgeKeyOverdue(user.session))) {
        removeListKey([user.session]);
        console.error('token expired');
        return ctx.app.emit(
          'error',
          {
            code: '401',
            message: '無効なトークン',
          },
          ctx,
        );
      }

      resetTime(user.session);

      if ((await getSetsValue('update_userInfo')).includes(String(user.userId))) {
        const userData = await queryKeyValue(user.session);

        const data = await getFullUserInfo(user.userId);

        await addSession(user.session, {
          ...userData,
          loginTime: new Date().toLocaleString(config.Backend.logTime),
          ...data
        });

        removeSetKeys('update_userInfo', [String(user.userId)]);
      }

      ctx.state.user = user;
    } catch (error) {
      console.error('Auth error:', error);
      return ctx.app.emit(
        'error',
        {
          code: '401',
          message: '無効なトークン',
        },
        ctx,
      );
    }
  } else {
    // For whitelisted endpoints, try to use token if provided
    if (token) {
      try {
        const user = jwt.verify(token, config.Backend.jwtSecret) as IuserTokenType;
        ctx.state.user = user;
      } catch {
        // Token invalid, use test user
        ctx.state.user = {
          userId: 1,
          userName: 'test_user',
          session: 'test_session',
          permissions: ['*|*'],
        } as any;
      }
    } else {
      // No token provided, use test user
      ctx.state.user = {
        userId: 1,
        userName: 'test_user',
        session: 'test_session',
        permissions: ['*|*'],
      } as any;
    }
  }

  await next();
};

export const usePermission = (permission: string) => async (ctx: Context, next: () => Promise<void>) => {
  const { session } = ctx.state.user;

  const sessionValue = await queryKeyValue(session);
  const permissions = sessionValue?.permissions || [];

  if (!matchesPermission(permissions, permission, ctx.request.body?.type || ctx.query.type)) {
    return ctx.app.emit(
      'error',
      {
        code: '403',
        message: 'アクセス権限がありません',
      },
      ctx,
    );
  }

  await next();
};

const resolveFileIds = async (
  ctx: Context,
  fileIdSource?: string | ((context: Context) => Promise<number | number[] | undefined> | number | number[] | undefined),
): Promise<number[]> => {
  if (typeof fileIdSource === 'function') {
    const value = await fileIdSource(ctx);
    const list = Array.isArray(value) ? value : [value];
    return list.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
  }

  const sourceKey = fileIdSource || 'id';
  const body = ctx.request.body as Record<string, unknown>;
  const value =
    ctx.params?.[sourceKey] ??
    body?.[sourceKey] ??
    body?.ids ??
    ctx.query?.[sourceKey];

  const list = Array.isArray(value) ? value : [value];
  return list.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
};

export const useFilePermission = (
  fileIdSource?: string | ((context: Context) => Promise<number | number[] | undefined> | number | number[] | undefined),
) => async (ctx: Context, next: () => Promise<void>) => {
  const { session, userId } = ctx.state.user as { session: string; userId: number };
  const sessionValue = await queryKeyValue(session);
  const permissions = sessionValue?.permissions || [];

  if (permissions.includes('*|*')) {
    await next();
    return;
  }

  const fileIds = await resolveFileIds(ctx, fileIdSource);
  if (fileIds.length === 0) {
    return ctx.app.emit(
      'error',
      {
        code: '403',
        message: 'ファイル権限がありません',
      },
      ctx,
    );
  }

  const userRoleRows = (await getUserRoleSer(userId)) as unknown as Array<{ role_id: number }>;
  const roleIds = userRoleRows.map((row) => Number(row.role_id)).filter((id) => Number.isInteger(id) && id > 0);
  if (roleIds.length === 0) {
    return ctx.app.emit(
      'error',
      {
        code: '403',
        message: 'ファイル権限がありません',
      },
      ctx,
    );
  }

  const allowedMappings = (await FileRole.findAll({
    raw: true,
    attributes: ['file_id'],
    where: {
      file_id: { [Op.in]: fileIds },
      role_id: { [Op.in]: roleIds },
    },
  })) as unknown as Array<{ file_id: number }>;

  const allowedFileIds = new Set(allowedMappings.map((row) => Number(row.file_id)));
  const allAllowed = fileIds.every((id) => allowedFileIds.has(id));

  if (!allAllowed) {
    return ctx.app.emit(
      'error',
      {
        code: '403',
        message: 'ファイル権限がありません',
      },
      ctx,
    );
  }

  await next();
};
