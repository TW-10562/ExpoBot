import { IUserInfoType, userType } from '@/types';
import { formatHumpLineTransfer } from '.';
import { getAllUserInfoSer } from '../service/user';
import { resolvePermissionsForRoleIds } from './permissionResolver';
import { getRolesForUserId, getUserById } from '@/db/adapter';

export const getFullUserInfo = async (userId: number) => {
  const pgUser = await getUserById(userId);
  const mysqlUser = pgUser ? null : await getAllUserInfoSer({ userId });
  const { password, ...res } = (pgUser || mysqlUser) as any;
  const roleRows = await getRolesForUserId(userId);
  const ids = roleRows.map((item: any) => item.role_id).filter((x: any) => typeof x === 'number');
  res.roles = roleRows;
  const userInfo = formatHumpLineTransfer(res) as userType;

  const roles = [];
  const roleIdsForPerms: number[] = [];
  let permissions: string[] = [];

  userInfo.roles.forEach((item) => {
    if (item.roleKey === 'admin') {
      roles.push('admin');
    } else {
      roles.push(item.roleKey);
      roleIdsForPerms.push(item.roleId);
    }
  });

  // Admin gets full access
  if (roles.includes('admin')) {
    permissions = ['*|*'];
  } else {
    permissions = await resolvePermissionsForRoleIds(roleIdsForPerms);
  }

  return {
    userInfo,
    roles,
    permissions,
  } as IUserInfoType;
};
