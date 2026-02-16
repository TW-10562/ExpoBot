import { Op } from 'sequelize';
import Menu from '@/mysql/model/menu.model';
import RoleMenu from '@/mysql/model/role_menu.model';

export const ADMIN_WILDCARD = '*|*';

export const splitPermissions = (rawPerms: string | null | undefined): string[] => {
  if (!rawPerms) {
    return [];
  }

  return rawPerms
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const normalizePermissions = (permissions: string[]): string[] => {
  return Array.from(new Set(permissions.map((item) => item.trim()).filter(Boolean)));
};

export const hasAdminWildcard = (permissions: string[]): boolean => {
  return permissions.includes(ADMIN_WILDCARD);
};

export const matchesPermission = (
  permissions: string[],
  requiredPermission: string,
  type?: string | number
): boolean => {
  if (hasAdminWildcard(permissions)) {
    return true;
  }

  const normalizedRequired = requiredPermission.trim();
  if (permissions.includes(normalizedRequired)) {
    return true;
  }

  if (String(normalizedRequired).includes('|')) {
    return false;
  }

  if (type === undefined || type === null || String(type).trim().length === 0) {
    return false;
  }

  return permissions.includes(`${normalizedRequired}|${String(type).trim()}`);
};

export const resolvePermissionsForRoleIds = async (roleIds: number[]): Promise<string[]> => {
  const normalizedRoleIds = Array.from(
    new Set(roleIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)),
  );

  if (normalizedRoleIds.length === 0) {
    return [];
  }

  const roleMenus = (await RoleMenu.findAll({
    raw: true,
    attributes: ['menu_id'],
    where: { role_id: { [Op.in]: normalizedRoleIds } },
  })) as unknown as Array<{ menu_id: number }>;

  const menuIds = Array.from(
    new Set(roleMenus.map((row) => Number(row.menu_id)).filter((id) => Number.isInteger(id) && id > 0)),
  );

  if (menuIds.length === 0) {
    return [];
  }

  const menus = (await Menu.findAll({
    raw: true,
    attributes: ['perms'],
    where: { menu_id: { [Op.in]: menuIds } },
  })) as unknown as Array<{ perms: string | null }>;

  const permissions = menus.flatMap((menu) => splitPermissions(menu.perms));
  return normalizePermissions(permissions);
};
