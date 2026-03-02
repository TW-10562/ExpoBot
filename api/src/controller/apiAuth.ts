import { Context } from 'koa';
import jwt from 'jsonwebtoken';
import dayjs from 'dayjs';

import { config } from '@config/index';
import { createHash } from '@/utils';
import { addSession, removeKey, removeListKey } from '@/utils/auth';
import { getFullUserInfo } from '@/utils/userInfo';
import { verifyPassword } from '@/service/user';
import { findUserByEmpId } from '@/service/adminUser';
import { detectDbMode } from '@/db/adapter';
import { pgPool } from '@/clients/postgres';

export const loginByEmployeeId = async (ctx: Context, next: () => Promise<void>) => {
  // Support both `employeeId` and `userName` fields from clients
  const body = (ctx.request.body || {}) as Record<string, any>;
  const employeeId = (body.employeeId || body.userName || body.user_name || '').toString();
  const password = (body.password || '').toString();

  if (!employeeId || !password) {
    return ctx.app.emit(
      'error',
      { code: '400', message: 'employeeId/userName と password は必須です' },
      ctx,
    );
  }

  const emp = String(employeeId).trim();
  const dbMode = await detectDbMode();

  let user: any = null;

  if (dbMode === 'postgres') {
    // user_name
    try {
      const res = await pgPool.query(
        `SELECT * FROM sys_user WHERE user_name = $1 AND COALESCE(del_flag, '0') = '0' LIMIT 1`,
        [emp],
      );
      user = res.rows[0] || null;
    } catch {}

    // email
    if (!user) {
      try {
        const res = await pgPool.query(
          `SELECT * FROM sys_user WHERE email = $1 AND COALESCE(del_flag, '0') = '0' LIMIT 1`,
          [emp],
        );
        user = res.rows[0] || null;
      } catch {}
    }

    // emp_id
    if (!user) {
      try {
        const res = await pgPool.query(
          `SELECT * FROM sys_user WHERE emp_id = $1 AND COALESCE(del_flag, '0') = '0' LIMIT 1`,
          [emp],
        );
        user = res.rows[0] || null;
      } catch {}
    }
  } else {
    user = await findUserByEmpId(emp);
  }

  if (!user) {
    return ctx.app.emit(
      'error',
      { code: '401', message: '認証に失敗しました' },
      ctx,
    );
  }

  // ✅ Accept both 0 and 1 as active (DB inconsistency safe)
  const activeStatuses = ['0', '1'];
  if (!activeStatuses.includes(String(user.status))) {
    return ctx.app.emit(
      'error',
      { code: '403', message: 'アカウントが無効です' },
      ctx,
    );
  }

  const valid = await verifyPassword(String(password), String(user.password || ''));
  if (!valid) {
    return ctx.app.emit(
      'error',
      { code: '401', message: '認証に失敗しました' },
      ctx,
    );
  }

  const userId = Number(user.user_id);
  const userName = String(user.user_name || user.emp_id || user.user_id);
  const empId = String(user.emp_id || emp || '');

  const session = createHash();

  const token = jwt.sign(
    {
      userId,
      userName,
      empId,
      session,
    },
    config.Backend.jwtSecret,
    { expiresIn: '12h' }, // ✅ SAFE expiry
  );

  const fullUser = await getFullUserInfo(userId);

  await addSession(session, {
    loginTime: dayjs().format(config.Backend.logTime),
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
