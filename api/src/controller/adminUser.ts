import { Context } from 'koa';

import {
  createAdminUser,
  deleteAdminUser,
  importAdminUsersFromCsv,
  listAdminUsers,
  updateAdminUser,
} from '@/service/adminUser';

const parsePayload = (body: any) => ({
  firstName: String(body?.firstName || '').trim(),
  lastName: String(body?.lastName || '').trim(),
  employeeId: String(body?.employeeId || '').trim(),
  userJobRole: String(body?.userJobRole || '').trim(),
  areaOfWork: String(body?.areaOfWork || '').trim(),
  role: String(body?.role || 'user').toLowerCase() === 'admin' ? 'admin' as const : 'user' as const,
  password: body?.password ? String(body.password) : undefined,
});

export const getAdminUsers = async (ctx: Context, next: () => Promise<void>) => {
  const users = await listAdminUsers();
  ctx.state.formatData = users;
  await next();
};

export const createAdminUserController = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const payload = parsePayload(ctx.request.body);
    if (!payload.firstName || !payload.lastName || !payload.employeeId || !payload.password) {
      return ctx.app.emit('error', { code: '400', message: '必須項目が不足しています' }, ctx);
    }

    const created = await createAdminUser(payload, Number(ctx.state.user?.userId));
    ctx.state.formatData = created;
    await next();
  } catch (error: any) {
    if (error?.code === 'duplicate_emp_id' || error?.name === 'SequelizeUniqueConstraintError') {
      return ctx.app.emit('error', { code: '409', message: 'employeeId は既に使用されています' }, ctx);
    }
    if (error?.message === 'validation_error') {
      return ctx.app.emit('error', { code: '400', message: '入力値が不正です' }, ctx);
    }
    return ctx.app.emit('error', { code: '500', message: 'ユーザー作成に失敗しました' }, ctx);
  }
};

export const updateAdminUserController = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const userId = Number(ctx.params.userId);
    const payload = parsePayload(ctx.request.body);
    if (!payload.firstName || !payload.lastName || !payload.employeeId) {
      return ctx.app.emit('error', { code: '400', message: '必須項目が不足しています' }, ctx);
    }

    const updated = await updateAdminUser(userId, payload, Number(ctx.state.user?.userId));
    ctx.state.formatData = updated;
    await next();
  } catch (error: any) {
    if (error?.code === 'duplicate_emp_id' || error?.name === 'SequelizeUniqueConstraintError') {
      return ctx.app.emit('error', { code: '409', message: 'employeeId は既に使用されています' }, ctx);
    }
    if (error?.message === 'not_found') {
      return ctx.app.emit('error', { code: '400', message: 'ユーザーが存在しません' }, ctx);
    }
    if (error?.message === 'validation_error') {
      return ctx.app.emit('error', { code: '400', message: '入力値が不正です' }, ctx);
    }
    return ctx.app.emit('error', { code: '500', message: 'ユーザー更新に失敗しました' }, ctx);
  }
};

export const deleteAdminUserController = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const userId = Number(ctx.params.userId);
    await deleteAdminUser(userId, Number(ctx.state.user?.userId));
    ctx.state.formatData = { success: true };
    await next();
  } catch {
    return ctx.app.emit('error', { code: '500', message: 'ユーザー削除に失敗しました' }, ctx);
  }
};

export const importAdminUsersCsvController = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const files = (ctx.request as any).files || {};
    const fileCandidate = files.file || files.csv || Object.values(files)[0];
    const file = Array.isArray(fileCandidate) ? fileCandidate[0] : fileCandidate;

    if (!file?.filepath) {
      return ctx.app.emit('error', { code: '400', message: 'CSV ファイルが必要です' }, ctx);
    }

    const report = await importAdminUsersFromCsv(file.filepath, Number(ctx.state.user?.userId));
    ctx.state.formatData = report;
    await next();
  } catch (error: any) {
    return ctx.app.emit('error', { code: '400', message: error?.message || 'CSV 取込に失敗しました' }, ctx);
  }
};
