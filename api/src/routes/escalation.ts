/**
 * Escalation Routes
 * Admin endpoints for managing escalations
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

const router = new Router({ prefix: '/api/escalation' });

/**
 * GET /api/escalation/list
 * Get escalations for current user's department
 * Requires HR_ADMIN or GA_ADMIN role
 */
router.get(
  '/list',
  usePermission(PERMISSIONS.ESCALATION_VIEW),
  formatHandle,
  async (ctx) => {
    try {
      const { departmentId, status, limit = 20 } = ctx.query;
      
      if (!departmentId) {
        ctx.status = 400;
        ctx.body = { error: 'departmentId is required' };
        return;
      }

      const escalations = await getEscalationsForDepartment(
        parseInt(departmentId as string),
        status as string | undefined,
        parseInt(limit as string)
      );

      ctx.body = {
        success: true,
        data: escalations,
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: (error as Error).message };
    }
  }
);

/**
 * GET /api/escalation/:ticketNumber
 * Get specific escalation by ticket number
 */
router.get(
  '/:ticketNumber',
  async (ctx) => {
    try {
      const { ticketNumber } = ctx.params;
      
      const escalation = await getEscalationByTicketNumber(ticketNumber);
      
      if (!escalation) {
        ctx.status = 404;
        ctx.body = { error: 'Escalation not found' };
        return;
      }

      ctx.body = {
        success: true,
        data: escalation,
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: (error as Error).message };
    }
  }
);

/**
 * PUT /api/escalation/:escalationId/assign
 * Assign escalation to admin
 * Requires ESCALATION_MANAGE permission
 */
router.put(
  '/:escalationId/assign',
  usePermission(PERMISSIONS.ESCALATION_MANAGE),
  formatHandle,
  async (ctx) => {
    try {
      const { escalationId } = ctx.params;
      const { admin_user_id } = ctx.request.body as any;
      
      if (!admin_user_id) {
        ctx.status = 400;
        ctx.body = { error: 'admin_user_id is required' };
        return;
      }

      const success = await assignEscalationToAdmin(
        parseInt(escalationId as string),
        BigInt(admin_user_id)
      );

      if (!success) {
        ctx.status = 404;
        ctx.body = { error: 'Escalation not found' };
        return;
      }

      ctx.body = {
        success: true,
        message: 'Escalation assigned',
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: (error as Error).message };
    }
  }
);

/**
 * PUT /api/escalation/:escalationId/resolve
 * Resolve escalation with admin response
 * Requires ESCALATION_MANAGE permission
 */
router.put(
  '/:escalationId/resolve',
  usePermission(PERMISSIONS.ESCALATION_MANAGE),
  formatHandle,
  async (ctx) => {
    try {
      const { escalationId } = ctx.params;
      const { admin_user_id, resolution_notes } = ctx.request.body as any;
      
      if (!resolution_notes) {
        ctx.status = 400;
        ctx.body = { error: 'resolution_notes is required' };
        return;
      }

      const success = await resolveEscalation(
        parseInt(escalationId as string),
        BigInt(admin_user_id || ctx.session?.userId || 0),
        resolution_notes
      );

      if (!success) {
        ctx.status = 404;
        ctx.body = { error: 'Escalation not found' };
        return;
      }

      ctx.body = {
        success: true,
        message: 'Escalation resolved',
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: (error as Error).message };
    }
  }
);

/**
 * GET /api/escalation/stats/dashboard
 * Get escalation statistics
 * Requires ESCALATION_VIEW permission
 */
router.get(
  '/stats/dashboard',
  usePermission(PERMISSIONS.ESCALATION_VIEW),
  formatHandle,
  async (ctx) => {
    try {
      const stats = await getEscalationStats();
      
      ctx.body = {
        success: true,
        data: stats,
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: (error as Error).message };
    }
  }
);

export default router;
