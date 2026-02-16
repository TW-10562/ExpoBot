import { Context } from 'koa';
import jwt from 'jsonwebtoken';
import dayjs from 'dayjs';

import { config } from '@config/index';
import { createHash } from '@/utils';
import { addSession, removeKey, removeListKey } from '@/utils/auth';
import { getFullUserInfo } from '@/utils/userInfo';
import { verifyPassword } from '@/service/user';
import { findUserByEmpId } from '@/service/adminUser';

export const loginByEmployeeId = async (ctx: Context, next: () => Promise<void>) => {
  const { employeeId, password } = (ctx.request.body || {}) as { employeeId?: string; password?: string };

  if (!employeeId || !password) {
    return ctx.app.emit(
      'error',
      {
        code: '400',
        message: 'employeeId と password は必須です',
      },
      ctx,
    );
  }

  const user = await findUserByEmpId(String(employeeId).trim());
  if (!user) {
    return ctx.app.emit(
      'error',
      {
        code: '401',
        message: '認証に失敗しました',
      },
      ctx,
    );
  }

  if (String(user.status) !== '1') {
    return ctx.app.emit(
      'error',
      {
        code: '403',
        message: 'アカウントが無効です',
      },
      ctx,
    );
  }

  const valid = await verifyPassword(String(password), String(user.password || ''));
  if (!valid) {
    return ctx.app.emit(
      'error',
      {
        code: '401',
        message: '認証に失敗しました',
      },
      ctx,
    );
  }

  const userId = Number(user.user_id);
  const userName = String(user.user_name || user.emp_id || user.user_id);
  const empId = String(user.emp_id || employeeId);

  const session = createHash();
  const token = jwt.sign(
    {
      userId,
      userName,
      empId,
      session,
      exp: dayjs().add(100, 'y').valueOf(),
    },
    config.Backend.jwtSecret,
  );

  const fullUser = await getFullUserInfo(userId);
  await addSession(session, {
    loginTime: new Date().toLocaleString(config.Backend.logTime),
    ...fullUser,
  });

  ctx.state.formatData = {
    token,
    userId,
    empId,
  };

  await next();
};

export const logoutByToken = async (ctx: Context, next: () => Promise<void>) => {
  const { session } = ctx.state.user || {};
  if (session) {
    await removeListKey([session]);
    await removeKey([session]);
  }
  ctx.state.formatData = { success: true };
  await next();
};
