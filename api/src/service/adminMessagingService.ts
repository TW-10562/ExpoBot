/**
 * Admin Messaging Service
 * 
 * Supports:
 * - Broadcast messages to all/department users
 * - Direct messages to specific users
 * - @mention support
 * - Message storage and auditability
 */

import AdminMessage from '@/mysql/model/admin_message.model';
import User from '@/mysql/model/user.model';
import { IAdminMessage } from '@/types/triage';
import { logAdminMessageSent } from '@/service/auditService';

interface IBroadcastMessageInput {
  sender_admin_id: bigint;
  title: string;
  content: string;
  recipient_department_id?: number;
  mentions?: bigint[];
  is_pinned?: boolean;
  expires_at?: Date;
  ipAddress?: string;
  userAgent?: string;
}

interface IDirectMessageInput {
  sender_admin_id: bigint;
  recipient_user_id: bigint;
  title: string;
  content: string;
  mentions?: bigint[];
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Send broadcast message to all users or specific department
 */
export async function sendBroadcastMessage(
  input: IBroadcastMessageInput
): Promise<IAdminMessage | null> {
  try {
    const message = await AdminMessage.create({
      sender_admin_id: input.sender_admin_id,
      message_type: 'BROADCAST',
      recipient_department_id: input.recipient_department_id,
      title: input.title,
      content: input.content,
      mentions: input.mentions,
      is_pinned: input.is_pinned || false,
      expires_at: input.expires_at,
    });

    // Log the action
    const recipientCount = await countBroadcastRecipients(
      input.recipient_department_id
    );
    await logAdminMessageSent(
      input.sender_admin_id,
      (message as any).id,
      'BROADCAST',
      recipientCount,
      input.ipAddress,
      input.userAgent
    );

    return (message as any).toJSON() as IAdminMessage;
  } catch (error) {
    console.error('Error sending broadcast message:', error);
    return null;
  }
}

/**
 * Send direct message to specific user
 */
export async function sendDirectMessage(
  input: IDirectMessageInput
): Promise<IAdminMessage | null> {
  try {
    const message = await AdminMessage.create({
      sender_admin_id: input.sender_admin_id,
      message_type: 'DIRECT',
      recipient_user_id: input.recipient_user_id,
      title: input.title,
      content: input.content,
      mentions: input.mentions,
    });

    // Log the action
    await logAdminMessageSent(
      input.sender_admin_id,
      (message as any).id,
      'DIRECT',
      1,
      input.ipAddress,
      input.userAgent
    );

    return (message as any).toJSON() as IAdminMessage;
  } catch (error) {
    console.error('Error sending direct message:', error);
    return null;
  }
}

/**
 * Get messages for a user (direct + broadcasts)
 */
export async function getMessagesForUser(
  userId: bigint,
  limit: number = 20
): Promise<IAdminMessage[]> {
  try {
    const messages = await AdminMessage.findAll({
      where: {
        [require('sequelize').Op.or]: [
          { recipient_user_id: userId, message_type: 'DIRECT' },
          { message_type: 'BROADCAST' },
        ],
      },
      order: [['created_at', 'DESC']],
      limit,
    });

    return messages.map((m: any) => m.toJSON() as IAdminMessage);
  } catch (error) {
    console.error('Error getting user messages:', error);
    return [];
  }
}

/**
 * Mark message as read (for direct messages)
 */
export async function markMessageAsRead(messageId: number): Promise<boolean> {
  try {
    const message = await AdminMessage.findByPk(messageId);
    if (!message) {
      return false;
    }

    await (message as any).update({
      is_read: true,
      read_at: new Date(),
    });

    return true;
  } catch (error) {
    console.error('Error marking message as read:', error);
    return false;
  }
}

/**
 * Pin a message for prominence
 */
export async function pinMessage(messageId: number): Promise<boolean> {
  try {
    const message = await AdminMessage.findByPk(messageId);
    if (!message) {
      return false;
    }

    await (message as any).update({ is_pinned: true });
    return true;
  } catch (error) {
    console.error('Error pinning message:', error);
    return false;
  }
}

/**
 * Unpin a message
 */
export async function unpinMessage(messageId: number): Promise<boolean> {
  try {
    const message = await AdminMessage.findByPk(messageId);
    if (!message) {
      return false;
    }

    await (message as any).update({ is_pinned: false });
    return true;
  } catch (error) {
    console.error('Error unpinning message:', error);
    return false;
  }
}

/**
 * Get pinned messages
 */
export async function getPinnedMessages(): Promise<IAdminMessage[]> {
  try {
    const messages = await AdminMessage.findAll({
      where: { is_pinned: true },
      order: [['created_at', 'DESC']],
    });

    return messages.map((m: any) => m.toJSON() as IAdminMessage);
  } catch (error) {
    console.error('Error getting pinned messages:', error);
    return [];
  }
}

/**
 * Extract @mentions from message content
 * Format: @username or @user_id
 */
export function extractMentions(content: string): bigint[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: bigint[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const identifier = match[1];
    // Try to parse as user ID
    if (/^\d+$/.test(identifier)) {
      mentions.push(BigInt(identifier));
    }
    // Otherwise would need username lookup (not implemented here)
  }

  return mentions;
}

/**
 * Process message content to replace @mentions with links
 */
export function processMentionsInContent(
  content: string,
  mentionedUserIds: bigint[]
): string {
  let processed = content;

  for (const userId of mentionedUserIds) {
    const pattern = new RegExp(`@${userId}`, 'g');
    processed = processed.replace(
      pattern,
      `<a href="/user/${userId}" class="mention">@${userId}</a>`
    );
  }

  return processed;
}

/**
 * Archive expired messages
 * Called periodically by scheduler
 */
export async function archiveExpiredMessages(): Promise<number> {
  try {
    const now = new Date();
    const result = await AdminMessage.destroy({
      where: {
        expires_at: { [require('sequelize').Op.lt]: now },
      },
    });

    console.log(`Archived ${result} expired messages`);
    return result;
  } catch (error) {
    console.error('Error archiving expired messages:', error);
    return 0;
  }
}

/**
 * Get broadcast message stats
 */
export async function getBroadcastStats(): Promise<{
  total_sent: number;
  by_department: Record<string, number>;
  unread_per_user: number;
}> {
  try {
    const totalBroadcasts = await AdminMessage.count({
      where: { message_type: 'BROADCAST' },
    });

    // Would need aggregation by department - simplified version
    return {
      total_sent: totalBroadcasts,
      by_department: {},
      unread_per_user: 0,
    };
  } catch (error) {
    console.error('Error getting broadcast stats:', error);
    return {
      total_sent: 0,
      by_department: {},
      unread_per_user: 0,
    };
  }
}

/**
 * Count broadcast recipients (for logging)
 */
async function countBroadcastRecipients(departmentId?: number): Promise<number> {
  try {
    if (departmentId) {
      // Count users in department
      return await User.count({
        where: { department: departmentId },
      });
    } else {
      // Count all active users
      return await User.count({
        where: { status: '1' },
      });
    }
  } catch (error) {
    console.error('Error counting broadcast recipients:', error);
    return 0;
  }
}
