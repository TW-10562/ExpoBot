/**
 * Identity Service - JWT, Session, CAPTCHA Management
 * Integrated with Aviary Platform identity system
 */

import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import svgCaptcha from 'svg-captcha';
import { getFullUserInfo } from '@/utils/userInfo';
import { changePasswordSer, createUserSer, getAllUserInfoSer, getUserInfo } from '@/service/user';
import { matchesPermission } from '@/utils/permissionResolver';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '12h';
const SESSION_EXPIRY = 3600 * 12; // 12 hours

interface IUserProfile {
  userId: number;
  userName: string;
  email?: string;
  avatar?: string;
  deptId?: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

interface IMenuItem {
  menuId: number;
  parentId: number | null;
  menuName: string;
  path: string;
  component?: string;
  icon?: string;
  orderNum: number;
  perms?: string;
  visible?: string;
  type?: string;
}

interface IUserRole {
  roleId: number;
  roleName: string;
  roleCode: string;
}

interface IRegisterUserInput {
  userName: string;
  password: string;
  email?: string;
  nickname?: string;
  status?: string;
}

class IdentityService {
  /**
   * Generate JWT token pair
   */
  generateTokens(userId: bigint | string, userData?: any) {
    const payload = {
      userId: String(userId),
      userName: userData?.userName,
      userEmail: userData?.email,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    });

    const refreshToken = jwt.sign(
      { ...payload, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 12 * 3600, // seconds
    };
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string | number): Promise<IUserProfile | null> {
    const numericUserId = Number(userId);
    if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
      return null;
    }

    const user = await getAllUserInfoSer({ userId: numericUserId });
    if (!user) {
      return null;
    }

    const fullInfo = await getFullUserInfo(numericUserId);
    return {
      userId: Number(user.user_id),
      userName: user.user_name,
      email: user.email || undefined,
      avatar: user.avatar || undefined,
      deptId: user.dept_id || undefined,
      status: user.status || '0',
      created_at: user.created_at,
      updated_at: user.updated_at,
      ...(fullInfo || {}),
    } as IUserProfile;
  }

  /**
   * Get user menu items (stub)
   */
  async getUserMenus(userId: string | number): Promise<IMenuItem[]> {
    return [];
  }

  /**
   * Get user permissions (stub)
   */
  async getUserPermissions(userId: string | number): Promise<string[]> {
    const fullInfo = await getFullUserInfo(Number(userId));
    return fullInfo.permissions || [];
  }

  /**
   * Get user roles (stub)
   */
  async getUserRoles(userId: string | number): Promise<IUserRole[]> {
    const fullInfo = await getFullUserInfo(Number(userId));
    return (fullInfo.userInfo.roles || []).map((role: any) => ({
      roleId: role.roleId,
      roleName: role.roleName,
      roleCode: role.roleKey,
    }));
  }

  /**
   * Update user password (stub)
   */
  async updatePassword(
    userId: string | number,
    oldPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const user = await getUserInfo({ userId: Number(userId) });
    if (!user || user.password !== oldPassword) {
      return false;
    }
    return changePasswordSer({ userId: Number(userId), password: newPassword });
  }

  /**
   * Register new user (stub)
   */
  async registerUser(input: IRegisterUserInput): Promise<IUserProfile | null> {
    const created = await createUserSer({
      userName: input.userName,
      password: input.password,
      department: 'Unknown',
      email: input.email,
      phonenumber: null,
      createBy: null,
      groupIds: [],
    });
    if (!created) {
      return null;
    }
    return this.getUserById(created.user_id);
  }

  /**
   * Hash password
   */
  async hashPassword(password: string): Promise<string> {
    return bcryptjs.hash(password, 10);
  }

  /**
   * Verify password
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcryptjs.compare(password, hash);
  }

  /**
   * Generate CAPTCHA
   */
  generateCaptcha() {
    const captcha = svgCaptcha.create({
      ignoreChars: '0o1i',
      noise: 3,
      color: true,
      background: '#fff',
    });

    return {
      svg: captcha.data,
      text: captcha.text,
    };
  }

  /**
   * Check if user has permission
   */
  async hasPermission(userId: string | number | bigint, requiredPermission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(String(userId));
    return matchesPermission(permissions, requiredPermission);
  }

  /**
   * Check if user has role
   */
  async hasRole(userId: string | number | bigint, requiredRole: string): Promise<boolean> {
    const userRoles = await this.getUserRoles(String(userId));
    return userRoles.some((role) => role.roleCode === requiredRole);
  }
}

export default new IdentityService();
