/**
 * Escalation Routes - Aviary RBAC Integration
 * Admin endpoints for managing escalations with Aviary permission system
 */

import Router from 'koa-router';
import { usePermission } from '@/controller/auth';
import PERMISSIONS from '@/utils/permissions';
import {
  getEscalationsForDepartment,
  assignEscalationToAdmin,
  resolveEscalation,
  getEscalationByTicketNumber,
  getEscalationStats,
  createEscalationTicket,
} from '@/service/escalationService';
import { formatHandle } from '@/controller/common';
import { requirePermission, adminOnly } from '../middleware/rbacMiddleware';
import { logAuditAction } from '../service/auditService';

const router = new Router({ prefix: '/api/escalation' });

const toBigIntOrUndefined = (value: unknown): bigint | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  try {
    return typeof value === 'bigint' ? value : BigInt(value as string | number);
  } catch {
    return undefined;
  }
};

const logOperation = async (ctx: any, actionType: string, details?: any): Promise<void> => {
  await logAuditAction({
    user_id: toBigIntOrUndefined(ctx.userId),
    action_type: actionType,
    resource_type: 'ESCALATION',
    resource_id: ctx.params?.ticketNumber || ctx.params?.id?.toString(),
    department_id: ctx.deptId,
    description: actionType,
    details,
    ip_address: ctx.ip,
    user_agent: typeof ctx.get === 'function' ? ctx.get('user-agent') : undefined,
    status: actionType.endsWith('_ERROR') ? 'FAILED' : 'SUCCESS',
  });
};

/**
 * GET /api/escalation/list
 * Get escalations for current user's department
 * Integrated with Aviary RBAC
 */
router.get(
  '/list',
  requirePermission('escalation:view'),
  formatHandle,
  async (ctx: any) => {
    try {
      const { departmentId, status, limit = 20 } = ctx.query;
      
      // Check if user has access to this department
      const userDeptId = ctx.deptId;
      const requestedDeptId = departmentId ? parseInt(departmentId as string) : userDeptId;

      // Only allow access to own department unless admin
      const isAdmin = ctx.authContext?.roles?.some((r: any) => r.roleCode === 'admin');
      if (!isAdmin && requestedDeptId !== userDeptId) {
        ctx.status = 403;
        ctx.body = {
          code: 403,
          msg: 'このデパートメントにアクセスする権限がありません',
          data: null,
        };
        await logOperation(ctx, 'ESCALATION_LIST_DENIED', {
          requestedDeptId,
          userDeptId,
        });
        return;
      }

      const escalations = await getEscalationsForDepartment(
        requestedDeptId || 0,
        status as string | undefined,
        parseInt(limit as string)
      );

      ctx.body = {
        code: 200,
        msg: 'エスカレーション一覧を取得しました',
        data: escalations,
      };

      await logOperation(ctx, 'ESCALATION_LIST', {
        departmentId: requestedDeptId,
        status,
        count: escalations?.length || 0,
      });
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        code: 500,
        msg: 'エスカレーション一覧の取得に失敗しました',
        data: null,
      };
      await logOperation(ctx, 'ESCALATION_LIST_ERROR', {
        error: (error as Error).message,
      });
    }
  }
);

/**
 * GET /api/escalation/:ticketNumber
 * Get specific escalation by ticket number
 * Integrated with Aviary RBAC
 */
router.get(
  '/:ticketNumber',
  async (ctx: any) => {
    try {
      const { ticketNumber } = ctx.params;
      const userId = ctx.userId;
      
      const escalation = await getEscalationByTicketNumber(ticketNumber);
      
      if (!escalation) {
        ctx.status = 404;
        ctx.body = {
          code: 404,
          msg: 'エスカレーションが見つかりません',
          data: null,
        };
        return;
      }

      // Check department access
      const isAdmin = ctx.authContext?.roles?.some((r: any) => r.roleCode === 'admin');
      if (!isAdmin && escalation.department_id !== ctx.deptId) {
        ctx.status = 403;
        ctx.body = {
          code: 403,
          msg: 'このエスカレーションにアクセスする権限がありません',
          data: null,
        };
        await logOperation(ctx, 'ESCALATION_VIEW_DENIED', {
          ticketNumber,
        });
        return;
      }

      ctx.body = {
        code: 200,
        msg: 'エスカレーション情報を取得しました',
        data: escalation,
      };

      await logOperation(ctx, 'ESCALATION_VIEW', {
        ticketNumber,
      });
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        code: 500,
        msg: 'エスカレーション取得に失敗しました',
        data: null,
      };
      await logOperation(ctx, 'ESCALATION_VIEW_ERROR', {
        error: (error as Error).message,
      });
    }
  }
);

/**
 * PUT /api/escalation/:escalationId/assign
 * Assign escalation to admin
 * Requires escalation:manage permission
 */
router.put(
  '/:escalationId/assign',
  requirePermission('escalation:manage'),
  formatHandle,
  async (ctx: any) => {
    try {
      const { escalationId } = ctx.params;
      const { admin_user_id } = ctx.request.body as any;
      const userId = ctx.userId;
      
      if (!admin_user_id) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          msg: 'admin_user_idは必須です',
          data: null,
        };
        return;
      }

      // Check department access
      const escalation = await getEscalationByTicketNumber('');
      const isAdmin = ctx.authContext?.roles?.some((r: any) => r.roleCode === 'admin');
      if (!isAdmin && escalation?.department_id !== ctx.deptId) {
        ctx.status = 403;
        ctx.body = {
          code: 403,
          msg: 'このエスカレーションを割り当てる権限がありません',
          data: null,
        };
        await logOperation(ctx, 'ESCALATION_ASSIGN_DENIED', {
          escalationId,
        });
        return;
      }

      const success = await assignEscalationToAdmin(
        parseInt(escalationId as string),
        BigInt(admin_user_id)
      );

      if (!success) {
        ctx.status = 404;
        ctx.body = {
          code: 404,
          msg: 'エスカレーションが見つかりません',
          data: null,
        };
        return;
      }

      ctx.body = {
        code: 200,
        msg: 'エスカレーションを割り当てました',
        data: null,
      };

      await logOperation(ctx, 'ESCALATION_ASSIGNED', {
        escalationId,
        admin_user_id,
        assigned_by: userId,
      });
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        code: 500,
        msg: 'エスカレーション割り当てに失敗しました',
        data: null,
      };
      await logOperation(ctx, 'ESCALATION_ASSIGN_ERROR', {
        error: (error as Error).message,
      });
    }
  }
);

/**
 * PUT /api/escalation/:escalationId/resolve
 * Resolve escalation with admin response
 * Requires escalation:manage permission
 */
router.put(
  '/:escalationId/resolve',
  requirePermission('escalation:manage'),
  formatHandle,
  async (ctx: any) => {
    try {
      const { escalationId } = ctx.params;
      const { admin_user_id, resolution_notes } = ctx.request.body as any;
      const userId = ctx.userId;
      
      if (!resolution_notes) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          msg: 'resolution_notesは必須です',
          data: null,
        };
        return;
      }

      const success = await resolveEscalation(
        parseInt(escalationId as string),
        BigInt(admin_user_id || userId || 0),
        resolution_notes
      );

      if (!success) {
        ctx.status = 404;
        ctx.body = {
          code: 404,
          msg: 'エスカレーションが見つかりません',
          data: null,
        };
        return;
      }

      ctx.body = {
        code: 200,
        msg: 'エスカレーションを解決しました',
        data: null,
      };

      await logOperation(ctx, 'ESCALATION_RESOLVED', {
        escalationId,
        resolved_by: userId,
        notes_length: resolution_notes?.length || 0,
      });
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        code: 500,
        msg: 'エスカレーション解決に失敗しました',
        data: null,
      };
      await logOperation(ctx, 'ESCALATION_RESOLVE_ERROR', {
        error: (error as Error).message,
      });
    }
  }
);

/**
 * GET /api/escalation/stats/dashboard
 * Get escalation statistics
 * Requires escalation:view permission
 */
router.get(
  '/stats/dashboard',
  requirePermission('escalation:view'),
  formatHandle,
  async (ctx: any) => {
    try {
      const userDeptId = ctx.deptId;
      const isAdmin = ctx.authContext?.roles?.some((r: any) => r.roleCode === 'admin');

      const stats = await getEscalationStats();
      
      // Filter stats by department if not admin
      const filteredStats = isAdmin ? stats : {
        ...stats,
        departmentId: userDeptId,
      };

      ctx.body = {
        code: 200,
        msg: 'エスカレーション統計を取得しました',
        data: filteredStats,
      };

      await logOperation(ctx, 'ESCALATION_STATS_VIEWED', {
        departmentId: userDeptId,
      });
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        code: 500,
        msg: 'エスカレーション統計取得に失敗しました',
        data: null,
      };
      await logOperation(ctx, 'ESCALATION_STATS_ERROR', {
        error: (error as Error).message,
      });
    }
  }
);

/**
 * POST /api/escalation/create
 * Create escalation ticket
 * Requires escalation:create permission
 */
router.post(
  '/create',
  requirePermission('escalation:create'),
  async (ctx: any) => {
    try {
      const {
        user_id,
        original_query,
        bot_answer,
        source_documents,
        department_id,
        reason,
      } = ctx.request.body as any;

      if (!user_id || !original_query || !department_id) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          msg: '必須フィールドが不足しています',
          data: null,
        };
        return;
      }

      const ticketId = await createEscalationTicket({
        user_id: BigInt(user_id),
        original_query,
        bot_answer,
        source_documents,
        department_id,
        reason,
        created_by: ctx.userId,
      });

      ctx.status = 201;
      ctx.body = {
        code: 200,
        msg: 'エスカレーションチケットを作成しました',
        data: {
          id: ticketId,
        },
      };

      await logOperation(ctx, 'ESCALATION_CREATED', {
        ticketId,
        user_id,
        department_id,
        created_by: ctx.userId,
      });
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        code: 500,
        msg: 'エスカレーションチケット作成に失敗しました',
        data: null,
      };
      await logOperation(ctx, 'ESCALATION_CREATE_ERROR', {
        error: (error as Error).message,
      });
    }
  }
);

export default router;
