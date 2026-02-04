/**
 * FAQ Analytics Routes
 * Admin endpoints for viewing FAQ analytics and recommendations
 */

import Router from 'koa-router';
import { usePermission } from '@/controller/auth';
import PERMISSIONS from '@/utils/permissions';
import {
  getFAQAnalyticsDashboard,
  getTopFAQsByDepartment,
  promoteToFAQ,
  demoteFromFAQ,
} from '@/service/faqAnalyticsService';
import { formatHandle } from '@/controller/common';

const router = new Router({ prefix: '/api/faq-analytics' });

/**
 * GET /api/faq-analytics/dashboard
 * Get FAQ analytics dashboard for admin
 * Requires FAQ_VIEW permission
 */
router.get(
  '/dashboard',
  usePermission(PERMISSIONS.FAQ_VIEW),
  formatHandle,
  async (ctx) => {
    try {
      const { departmentId } = ctx.query;
      
      const dashboard = await getFAQAnalyticsDashboard(
        departmentId ? parseInt(departmentId as string) : undefined
      );

      ctx.body = {
        success: true,
        data: dashboard,
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: (error as Error).message };
    }
  }
);

/**
 * GET /api/faq-analytics/top/:departmentId
 * Get top FAQs for department
 */
router.get(
  '/top/:departmentId',
  formatHandle,
  async (ctx) => {
    try {
      const { departmentId } = ctx.params;
      const { limit = 10 } = ctx.query;
      
      const faqs = await getTopFAQsByDepartment(
        parseInt(departmentId as string),
        parseInt(limit as string)
      );

      ctx.body = {
        success: true,
        data: faqs,
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: (error as Error).message };
    }
  }
);

/**
 * POST /api/faq-analytics/promote
 * Promote query to FAQ
 * Requires FAQ_MANAGE permission
 */
router.post(
  '/promote',
  usePermission(PERMISSIONS.FAQ_MANAGE),
  formatHandle,
  async (ctx) => {
    try {
      const { departmentId, query } = ctx.request.body as any;
      
      if (!departmentId || !query) {
        ctx.status = 400;
        ctx.body = { error: 'departmentId and query are required' };
        return;
      }

      const success = await promoteToFAQ(parseInt(departmentId), query);

      if (!success) {
        ctx.status = 404;
        ctx.body = { error: 'Query not found' };
        return;
      }

      ctx.body = {
        success: true,
        message: 'Query promoted to FAQ',
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: (error as Error).message };
    }
  }
);

/**
 * POST /api/faq-analytics/demote
 * Demote query from FAQ
 * Requires FAQ_MANAGE permission
 */
router.post(
  '/demote',
  usePermission(PERMISSIONS.FAQ_MANAGE),
  formatHandle,
  async (ctx) => {
    try {
      const { departmentId, query } = ctx.request.body as any;
      
      if (!departmentId || !query) {
        ctx.status = 400;
        ctx.body = { error: 'departmentId and query are required' };
        return;
      }

      const success = await demoteFromFAQ(parseInt(departmentId), query);

      if (!success) {
        ctx.status = 404;
        ctx.body = { error: 'Query not found' };
        return;
      }

      ctx.body = {
        success: true,
        message: 'Query demoted from FAQ',
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: (error as Error).message };
    }
  }
);

export default router;
