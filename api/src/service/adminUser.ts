import Role from '@/mysql/model/role.model';
import User from '@/mysql/model/user.model';
import UserRole from '@/mysql/model/user_role.model';
import { hashPassword } from '@/service/user';
import seq from '@/mysql/db/seq.db';
import fs from 'node:fs/promises';
import Papa from 'papaparse';
import { Op } from 'sequelize';

export type AdminUserInput = {
  firstName: string;
  lastName: string;
  employeeId: string;
  userJobRole: string;
  areaOfWork: string;
  role: 'admin' | 'user';
  password?: string;
};

const normalizeRole = (value: unknown): 'admin' | 'user' =>
  String(value || '').toLowerCase() === 'admin' ? 'admin' : 'user';

const normalizeJobRole = (value: string) => String(value || '').trim().toLowerCase();
const normalizeArea = (value: string) => String(value || '').trim().toLowerCase();

const buildUserName = (firstName: string, lastName: string, employeeId: string) => {
  const fullName = `${String(firstName || '').trim()} ${String(lastName || '').trim()}`.trim();
  return fullName || employeeId;
};

const toResponseUser = (user: any, role: 'admin' | 'user') => ({
  user_id: user.user_id,
  emp_id: user.emp_id,
  first_name: user.first_name,
  last_name: user.last_name,
  job_role_key: user.job_role_key,
  area_of_work_key: user.area_of_work_key,
  role,
  updated_at: user.updated_at,
});

async function getRoleIdByKey(roleKey: 'admin' | 'user', transaction?: any) {
  const role = await Role.findOne({
    raw: true,
    attributes: ['role_id'],
    where: { role_key: roleKey, del_flag: '0' },
    transaction,
  }) as any;

  if (!role?.role_id) {
    throw new Error(`Role not found: ${roleKey}`);
  }

  return Number(role.role_id);
}

async function setUserRole(userId: number, roleKey: 'admin' | 'user', transaction?: any) {
  const roleId = await getRoleIdByKey(roleKey, transaction);
  await UserRole.destroy({ where: { user_id: userId }, transaction });
  await UserRole.create({ user_id: userId, role_id: roleId } as any, { transaction });
}

export async function listAdminUsers() {
  const rows = await User.findAll({
    raw: true,
    attributes: [
      'user_id',
      'emp_id',
      'first_name',
      'last_name',
      'job_role_key',
      'area_of_work_key',
      'updated_at',
    ],
    where: { deleted_at: null },
    order: [['updated_at', 'DESC'], ['user_id', 'DESC']],
  }) as any[];

  const roleRows = await UserRole.findAll({ raw: true, attributes: ['user_id', 'role_id'] }) as any[];
  const roleIds = Array.from(new Set(roleRows.map((r) => Number(r.role_id)).filter(Number.isFinite)));
  const roles = roleIds.length
    ? (await Role.findAll({ raw: true, attributes: ['role_id', 'role_key'], where: { role_id: roleIds } }) as any[])
    : [];

  const roleMap = new Map<number, string>();
  roles.forEach((r) => roleMap.set(Number(r.role_id), String(r.role_key || '')));

  const userRoleMap = new Map<number, 'admin' | 'user'>();
  roleRows.forEach((ur) => {
    const userId = Number(ur.user_id);
    const key = roleMap.get(Number(ur.role_id));
    if (!Number.isFinite(userId)) return;
    if (key === 'admin') {
      userRoleMap.set(userId, 'admin');
      return;
    }
    if (!userRoleMap.has(userId) && key === 'user') {
      userRoleMap.set(userId, 'user');
    }
  });

  return rows
    .filter((u) => !!u.emp_id)
    .map((u) => toResponseUser(u, userRoleMap.get(Number(u.user_id)) || 'user'));
}

export async function createAdminUser(input: AdminUserInput, actorUserId?: number) {
  const employeeId = String(input.employeeId || '').trim();
  const firstName = String(input.firstName || '').trim();
  const lastName = String(input.lastName || '').trim();
  const password = String(input.password || '');

  if (!employeeId || !firstName || !lastName || !password) {
    throw new Error('validation_error');
  }

  const existing = await User.findOne({ raw: true, where: { emp_id: employeeId, deleted_at: null } }) as any;
  if (existing) {
    const err: any = new Error('duplicate_emp_id');
    err.code = 'duplicate_emp_id';
    throw err;
  }

  return seq.transaction(async (transaction) => {
    const created = await User.create({
      user_name: buildUserName(firstName, lastName, employeeId),
      emp_id: employeeId,
      first_name: firstName,
      last_name: lastName,
      job_role_key: normalizeJobRole(input.userJobRole),
      area_of_work_key: normalizeArea(input.areaOfWork),
      password: await hashPassword(password),
      status: '1',
      sso_bound: 0,
      create_by: actorUserId || null,
    } as any, { transaction }) as any;

    await setUserRole(Number(created.dataValues.user_id), normalizeRole(input.role), transaction);

    return toResponseUser(created.dataValues, normalizeRole(input.role));
  });
}

export async function updateAdminUser(userId: number, input: AdminUserInput, actorUserId?: number) {
  if (!Number.isFinite(userId)) throw new Error('validation_error');

  const employeeId = String(input.employeeId || '').trim();
  const firstName = String(input.firstName || '').trim();
  const lastName = String(input.lastName || '').trim();

  if (!employeeId || !firstName || !lastName) {
    throw new Error('validation_error');
  }

  const target = await User.findOne({ raw: true, where: { user_id: userId, deleted_at: null } }) as any;
  if (!target) throw new Error('not_found');

  const duplicate = await User.findOne({
    raw: true,
    where: {
      emp_id: employeeId,
      deleted_at: null,
      user_id: { [Op.ne]: userId } as any,
    } as any,
  }) as any;

  if (duplicate) {
    const err: any = new Error('duplicate_emp_id');
    err.code = 'duplicate_emp_id';
    throw err;
  }

  return seq.transaction(async (transaction) => {
    const updateData: any = {
      user_name: buildUserName(firstName, lastName, employeeId),
      emp_id: employeeId,
      first_name: firstName,
      last_name: lastName,
      job_role_key: normalizeJobRole(input.userJobRole),
      area_of_work_key: normalizeArea(input.areaOfWork),
      status: '1',
      create_by: actorUserId || target.create_by || null,
    };

    if (input.password && String(input.password).trim()) {
      updateData.password = await hashPassword(String(input.password));
    }

    await User.update(updateData, { where: { user_id: userId }, transaction });
    await setUserRole(userId, normalizeRole(input.role), transaction);

    const updated = await User.findOne({ raw: true, where: { user_id: userId }, transaction }) as any;
    return toResponseUser(updated, normalizeRole(input.role));
  });
}

export async function deleteAdminUser(userId: number, actorUserId?: number) {
  if (!Number.isFinite(userId)) throw new Error('validation_error');

  await seq.transaction(async (transaction) => {
    await UserRole.destroy({ where: { user_id: userId }, transaction });
    await User.update(
      {
        deleted_at: new Date(),
        deleted_by: actorUserId || null,
      } as any,
      { where: { user_id: userId }, transaction },
    );
  });

  return { success: true };
}

function mapCsvRow(row: Record<string, any>): AdminUserInput | null {
  const keys = Object.fromEntries(Object.keys(row).map((k) => [k.trim().toLowerCase(), row[k]]));

  const firstName = String(keys['first name'] ?? keys['first_name'] ?? '').trim();
  const lastName = String(keys['last name'] ?? keys['last_name'] ?? '').trim();
  const employeeId = String(keys['employee id'] ?? keys['employee_id'] ?? keys['emp_id'] ?? '').trim();
  const userJobRole = String(keys['user job role'] ?? keys['user_job_role'] ?? keys['job_role_key'] ?? '').trim();
  const areaOfWork = String(keys['area of work'] ?? keys['area_of_work'] ?? keys['area_of_work_key'] ?? '').trim();
  const role = normalizeRole(keys.role);
  const password = String(keys.password ?? '').trim();

  if (!firstName || !lastName || !employeeId) return null;

  return {
    firstName,
    lastName,
    employeeId,
    userJobRole,
    areaOfWork,
    role,
    password,
  };
}

export async function importAdminUsersFromCsv(filePath: string, actorUserId?: number) {
  const csvText = await fs.readFile(filePath, 'utf8');
  const parsed = Papa.parse<Record<string, any>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors?.length) {
    throw new Error(`csv_parse_error: ${parsed.errors[0].message}`);
  }

  const report = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (const row of parsed.data) {
    const normalized = mapCsvRow(row);
    if (!normalized) {
      report.skipped += 1;
      continue;
    }

    try {
      const existing = await User.findOne({
        raw: true,
        where: { emp_id: normalized.employeeId, deleted_at: null },
      }) as any;

      if (existing) {
        await updateAdminUser(Number(existing.user_id), normalized, actorUserId);
        report.updated += 1;
      } else {
        if (!normalized.password) {
          report.skipped += 1;
          report.errors.push(`Skipped ${normalized.employeeId}: password is required for new user`);
          continue;
        }
        await createAdminUser(normalized, actorUserId);
        report.created += 1;
      }
    } catch (error: any) {
      report.skipped += 1;
      report.errors.push(`Skipped ${normalized.employeeId}: ${error?.message || 'unknown error'}`);
    }
  }

  return report;
}

export async function findUserByEmpId(employeeId: string) {
  return User.findOne({ raw: true, where: { emp_id: employeeId, deleted_at: null } }) as any;
}

export async function getPrimaryRoleForUser(userId: number): Promise<'admin' | 'user'> {
  const mappings = await UserRole.findAll({ raw: true, attributes: ['role_id'], where: { user_id: userId } }) as any[];
  if (!mappings.length) return 'user';

  const roleIds = mappings.map((r) => Number(r.role_id)).filter(Number.isFinite);
  const roles = await Role.findAll({ raw: true, attributes: ['role_key'], where: { role_id: roleIds } }) as any[];
  if (roles.some((r) => String(r.role_key) === 'admin')) return 'admin';
  return 'user';
}
