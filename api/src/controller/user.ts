import SsoUserBind from '@/mysql/model/sso_user_bind.model';
import UserRole from '@/mysql/model/user_role.model';
import {
  createUserSer,
  deleteUser,
  getAllUserInfoSer,
  getUserInfo,
  getUserList,
  updateLastLoginSer,
  updateUserSer,
  updateUserStatus,
  changePasswordSer,
  verifyPassword,
} from '@/service/user';
import { getUserGroupsSer } from '@/service/group';
import {
  userListType,
  userQuerySerType,
  userQueryType,
  userType,
} from '@/types';
import { createHash, formatHumpLineTransfer } from '@/utils';
import { addAll } from '@/utils/mapper';
import { getKeyValue, setKeyValue } from '@/utils/redis';
import { getFullUserInfo } from '@/utils/userInfo';
import dayjs from 'dayjs';
import jwt from 'jsonwebtoken';
import { Context } from 'koa';
import {
  addSession,
  queryKeyValue,
  removeKey,
  removeListKey,
} from '@/utils/auth';
import { config } from '@config/index';
import { Op } from 'sequelize';
import { detectDbMode } from '@/db/adapter';

/* ================================
   Helpers
================================ */

const isAccountActive = (status: unknown) =>
  ['0', '1'].includes(String(status ?? ''));

/* ================================
   Login validation (password only)
================================ */

export const loginVal = async (ctx: Context, next: () => Promise<void>) => {
  // Accept either `userName` or `employeeId` for legacy clients
  const body = ctx.request.body as any;
  const userName = (body.userName || body.employeeId || body.user_name || '').toString();
  const password = (body.password || '').toString();

  try {
    const user = await getUserInfo({ userName });

    if (!user) {
      return ctx.app.emit(
        'error',
        { code: '400', message: 'ユーザーが存在しません' },
        ctx,
      );
    }

    const fullUser = await getAllUserInfoSer({ userId: user.user_id });

    if (!fullUser || !isAccountActive(fullUser.status)) {
      return ctx.app.emit(
        'error',
        { code: '403', message: 'アカウントが無効です' },
        ctx,
      );
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return ctx.app.emit(
        'error',
        { code: '400', message: 'パスワードが間違っています' },
        ctx,
      );
    }

    await updateLastLoginSer(user.user_id);
    ctx.state.user = formatHumpLineTransfer(user);

    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      { code: '400', message: 'ユーザーログインに失敗しました' },
      ctx,
    );
  }
};

/* ================================
   Login (token issue)
================================ */

export const login = async (ctx: Context, next: () => Promise<void>) => {
  const { userId, userName } = ctx.state.user;

  try {
    const session = createHash();

    const token = jwt.sign(
      { userId, userName, session },
      config.Backend.jwtSecret,
      { expiresIn: '12h' }, // ✅ FIXED
    );

    const userInfo = await getFullUserInfo(userId);

    await addSession(session, {
      loginTime: dayjs().format(config.Backend.logTime),
      ...userInfo,
    });

    ctx.state.formatData = { token };
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      { code: '400', message: 'ログイン処理に失敗しました' },
      ctx,
    );
  }
};

/* ================================
   User info
================================ */

export const queryUserInfo = async (ctx: Context, next: () => Promise<void>) => {
  const { session } = ctx.state.user;
  const data = await queryKeyValue(session);

  ctx.state.formatData = {
    userInfo: data.userInfo,
    roles: data.roles,
    permissions: data.permissions,
  };

  await next();
};

/* ================================
   Logout
================================ */

export const logout = async (ctx: Context, next: () => Promise<void>) => {
  const { session } = ctx.state.user || {};
  if (session) {
    await removeListKey([session]);
    await removeKey([session]);
  }
  await next();
};

/* ================================
   User CRUD
================================ */

export const getAllUsers = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const { pageNum, pageSize, ...params } = ctx.query as unknown as userQueryType;
    const newParams = { pageNum, pageSize } as userQuerySerType;

    if (params.keyword) {
      newParams.user_name = { [Op.like]: `${params.keyword}%` };
    }
    if (params.flag) {
      newParams.status = params.flag;
    }

    const res = (await getUserList(newParams)) as userListType;
    ctx.state.formatData = res;
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      { code: '400', message: 'ユーザー一覧の取得に失敗しました' },
      ctx,
    );
  }
};

export const createUser = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const { userName, email, phonenumber, groupIds, password, department } =
      ctx.request.body;

    if (!userName || userName.length < 4) {
      return ctx.app.emit(
        'error',
        { code: '400', message: 'ユーザー名は4文字以上必要です' },
        ctx,
      );
    }

    const exists = await getUserInfo({ userName });
    if (exists) {
      return ctx.app.emit(
        'error',
        { code: '400', message: 'このユーザー名は既に使用されています' },
        ctx,
      );
    }

    const creator = ctx.state.user?.userId;

    const newUser = await createUserSer({
      userName,
      password,
      department,
      email,
      phonenumber,
      createBy: creator,
      groupIds: groupIds || [],
    });

    ctx.state.formatData = formatHumpLineTransfer(newUser);
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      { code: '500', message: 'ユーザー作成に失敗しました' },
      ctx,
    );
  }
};

export const putUserPassword = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const { userId, password } = ctx.request.body;
    await changePasswordSer({ userId, password });
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      { code: '500', message: 'パスワード更新に失敗しました' },
      ctx,
    );
  }
};

/* ================================
   Missing lightweight controllers (thin wrappers)
   These implement minimal behavior to satisfy routes without changing business logic.
================================ */

export const delUser = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const id = ctx.params.id;
    await deleteUser(id, ctx.state.user?.userId);
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      { code: '500', message: 'ユーザー削除に失敗しました' },
      ctx,
    );
  }
};

export const getUserBase = async (ctx: Context, next: () => Promise<void>) => {
  // Ensure ctx.state.user has full user info when available
  try {
    const userId = ctx.state.user?.userId;
    if (userId) {
      const full = await getAllUserInfoSer({ userId });
      if (full) ctx.state.user = { ...ctx.state.user, ...full };
    }
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit('error', { code: '500', message: 'ユーザー情報取得に失敗しました' }, ctx);
  }
};

export const getUserGroups = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const { userId } = ctx.params;
    const groups = await getUserGroupsSer(Number(userId));
    ctx.state.formatData = { groups };
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit('error', { code: '500', message: 'ユーザーグループの取得に失敗しました' }, ctx);
  }
};

export const putUserStatus = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const ok = await updateUserStatus(ctx.request.body);
    ctx.state.formatData = { success: !!ok };
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit('error', { code: '500', message: 'ユーザーステータス更新に失敗しました' }, ctx);
  }
};

export const registerUser = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const { userName, password, email, phonenumber, department, groupIds } = ctx.request.body;
    const creator = ctx.state.user?.userId || null;
    const newUser = await createUserSer({ userName, password, email, phonenumber, department, createBy: creator, groupIds: groupIds || [] });
    ctx.state.formatData = newUser;
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit('error', { code: '500', message: 'ユーザー登録に失敗しました' }, ctx);
  }
};

export const updateUser = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const updated = await updateUserSer({ ...ctx.request.body });
    ctx.state.formatData = { success: !!updated };
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit('error', { code: '500', message: 'ユーザー更新に失敗しました' }, ctx);
  }
};

/* ================================
   Azure AD SSO (UNCHANGED except expiry)
================================ */

export const authExchange = async (ctx: Context, next: () => Promise<void>) => {
  const authCode = ctx.query.auth_code as string;
  if (!authCode) {
    return ctx.app.emit(
      'error',
      { code: '400', message: 'Missing code' },
      ctx,
    );
  }

  const token = await getKeyValue(`auth_code_${authCode}`);
  if (!token) {
    return ctx.app.emit(
      'error',
      { code: '400', message: 'Invalid or expired code' },
      ctx,
    );
  }

  ctx.state.formatData = { token };
  await next();
};


export const authCallback = async (ctx) => {
  ctx.body = { message: 'authCallback not implemented' };
};

