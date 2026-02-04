/**
 * Admin Messaging Routes
 */

import Router from 'koa-router';
import { usePermission } from '@/controller/auth';
import PERMISSIONS from '@/utils/permissions';
import {
  sendBroadcastMessage,
  sendDirectMessage,
  getMessagesForUser,
  markMessageAsRead,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  extractMentions,
} from '@/service/adminMessagingService';
import { formatHandle } from '@/controller/common';
import Joi from 'joi';

const router = new Router({ prefix: '/api/admin-message' });

/**
 * POST /api/admin-message/broadcast
 * Send broadcast message to all or department users
 * Requires ADMIN role
 */
router.post(
  '/broadcast',
  usePermission(PERMISSIONS.ADMIN_MESSAGE_SEND),
  formatHandle,
  async (ctx) => {
    try {
      const { title, content, recipient_department_id, is_pinned, expires_at } = ctx.request.body as any;
      
      if (!title || !content) {
        ctx.status = 400;
        ctx.body = { error: 'title and content are required' };
        return;
      }

      // Extract mentions from content
      const mentions = extractMentions(content);

      const message = await sendBroadcastMessage({
        sender_admin_id: ctx.session?.userId,
        title,
        content,
        recipient_department_id: recipient_department_id ? parseInt(recipient_department_id) : undefined,
        mentions,
        is_pinned: is_pinned || false,
        expires_at: expires_at ? new Date(expires_at) : undefined,
        ipAddress: ctx.ip,
        userAgent: ctx.get('user-agent'),
      });

      if (!message) {
        ctx.status = 500;
        ctx.body = { error: 'Failed to send message' };
        return;
      }

      ctx.body = {
        success: true,
        data: message,
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: (error as Error).message };
    }
  }
);

/**
 * POST /api/admin-message/direct
 * Send direct message to specific user
 * Requires ADMIN role
 */
router.post(
  '/direct',
  usePermission(PERMISSIONS.ADMIN_MESSAGE_SEND),
  formatHandle,
  async (ctx) => {
    try {
      const { recipient_user_id, title, content } = ctx.request.body as any;
      
      if (!recipient_user_id || !title || !content) {
        ctx.status = 400;
        ctx.body = { error: 'recipient_user_id, title, and content are required' };
        return;
      }

      // Extract mentions
      const mentions = extractMentions(content);

      const message = await sendDirectMessage({
        sender_admin_id: ctx.session?.userId,
        recipient_user_id: BigInt(recipient_user_id),
        title,
        content,
        mentions,
        ipAddress: ctx.ip,
        userAgent: ctx.get('user-agent'),
      });

      if (!message) {
        ctx.status = 500;
        ctx.body = { error: 'Failed to send message' };
        return;
      }

      ctx.body = {
        success: true,
        data: message,
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: (error as Error).message };
    }
  }
);

/**
 * GET /api/admin-message/list
 * Get messages for current user
 */
router.get(
  '/list',
  formatHandle,
  async (ctx) => {
    try {
      const { limit = 20 } = ctx.query;
      
      const messages = await getMessagesForUser(
        ctx.session?.userId,
        parseInt(limit as string)
      );

      ctx.body = {
        success: true,
        data: messages,
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: (error as Error).message };
    }
  }
);

/**
 * PUT /api/admin-message/:messageId/read
 * Mark message as read
 */
router.put(
  '/:messageId/read',
  formatHandle,
  async (ctx) => {
    try {
      const { messageId } = ctx.params;
      
      const success = await markMessageAsRead(parseInt(messageId as string));

      if (!success) {
        ctx.status = 404;
        ctx.body = { error: 'Message not found' };
        return;
      }

      ctx.body = {
        success: true,
        message: 'Message marked as read',
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: (error as Error).message };
    }
  }
);

/**
 * PUT /api/admin-message/:messageId/pin
 * Pin message for prominence
 * Requires ADMIN role
 */
router.put(
  '/:messageId/pin',
  usePermission(PERMISSIONS.ADMIN_MESSAGE_SEND),
  formatHandle,
  async (ctx) => {
    try {
      const { messageId } = ctx.params;
      
      const success = await pinMessage(parseInt(messageId as string));

      if (!success) {
        ctx.status = 404;
        ctx.body = { error: 'Message not found' };
        return;
      }

      ctx.body = {
        success: true,
        message: 'Message pinned',
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: (error as Error).message };
    }
  }
);

/**
 * PUT /api/admin-message/:messageId/unpin
 * Unpin message
 * Requires ADMIN role
 */
router.put(
  '/:messageId/unpin',
  usePermission(PERMISSIONS.ADMIN_MESSAGE_SEND),
  formatHandle,
  async (ctx) => {
    try {
      const { messageId } = ctx.params;
      
      const success = await unpinMessage(parseInt(messageId as string));

      if (!success) {
        ctx.status = 404;
        ctx.body = { error: 'Message not found' };
        return;
      }

      ctx.body = {
        success: true,
        message: 'Message unpinned',
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: (error as Error).message };
    }
  }
);

/**
 * GET /api/admin-message/pinned
 * Get pinned messages
 */
router.get(
  '/pinned',
  formatHandle,
  async (ctx) => {
    try {
      const messages = await getPinnedMessages();
      
      ctx.body = {
        success: true,
        data: messages,
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: (error as Error).message };
    }
  }
);

export default router;
