/**
 * Audit Logging Service
 * 
 * CRITICAL: All significant actions must be audited:
 * - Queries and classifications
 * - Answer generation
 * - Admin actions
 * - Document access
 * - Escalations
 * - Messaging
 * 
 * Ensures compliance and security tracking
 */

import AuditLog from '@/mysql/model/audit_log.model';
import { IAuditLog } from '@/types/triage';

interface IAuditLogInput {
  user_id?: bigint;
  action_type: string;
  resource_type: string;
  resource_id?: string;
  department_id?: number;
  description: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  status?: 'SUCCESS' | 'FAILED' | 'PARTIAL';
}

/**
 * Log an action to audit log
 * Called for: queries, answers, escalations, admin actions, document access
 */
export async function logAuditAction(input: IAuditLogInput): Promise<IAuditLog> {
  try {
    const log = await AuditLog.create({
      user_id: input.user_id,
      action_type: input.action_type,
      resource_type: input.resource_type,
      resource_id: input.resource_id,
      department_id: input.department_id,
      description: input.description,
      details: input.details ? JSON.stringify(input.details) : null,
      ip_address: input.ip_address,
      user_agent: input.user_agent,
      status: input.status || 'SUCCESS',
    });

    return log.toJSON() as IAuditLog;
  } catch (error) {
    console.error('Failed to log audit action:', error);
    throw error;
  }
}

/**
 * Log a query classification
 */
export async function logQueryClassification(
  userId: bigint,
  taskId: string,
  query: string,
  department: 'HR' | 'GA' | 'OTHER',
  confidence: number,
  language: string,
  keywords: string[],
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditAction({
    user_id: userId,
    action_type: 'QUERY_CLASSIFIED',
    resource_type: 'TASK',
    resource_id: taskId,
    department_id: department === 'OTHER' ? undefined : (department === 'HR' ? 1 : 2),
    description: `Query classified as ${department} (confidence: ${confidence}%)`,
    details: {
      department,
      confidence,
      language,
      keywords,
      query_preview: query.substring(0, 100),
    },
    ip_address: ipAddress,
    user_agent: userAgent,
    status: 'SUCCESS',
  });
}

/**
 * Log RAG retrieval
 */
export async function logRAGRetrieval(
  userId: bigint,
  taskId: string,
  departmentId: number,
  sourceDocumentIds: number[],
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditAction({
    user_id: userId,
    action_type: 'RAG_TRIGGERED',
    resource_type: 'TASK',
    resource_id: taskId,
    department_id: departmentId,
    description: `RAG retrieval executed, ${sourceDocumentIds.length} documents retrieved`,
    details: {
      source_document_ids: sourceDocumentIds,
    },
    ip_address: ipAddress,
    user_agent: userAgent,
    status: 'SUCCESS',
  });
}

/**
 * Log answer generation
 */
export async function logAnswerGeneration(
  userId: bigint,
  taskId: string,
  departmentId: number,
  language: string,
  sourceDocumentIds: number[],
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditAction({
    user_id: userId,
    action_type: 'ANSWER_GENERATED',
    resource_type: 'TASK',
    resource_id: taskId,
    department_id: departmentId,
    description: `Answer generated in ${language}, sourced from ${sourceDocumentIds.length} documents`,
    details: {
      language,
      source_document_ids: sourceDocumentIds,
    },
    ip_address: ipAddress,
    user_agent: userAgent,
    status: 'SUCCESS',
  });
}

/**
 * Log escalation
 */
export async function logEscalation(
  userId: bigint,
  escalationId: number,
  escalationTicketNumber: string,
  departmentId: number,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditAction({
    user_id: userId,
    action_type: 'ESCALATE',
    resource_type: 'ESCALATION',
    resource_id: escalationTicketNumber,
    department_id: departmentId,
    description: `Query escalated to department admin`,
    details: {
      escalation_id: escalationId,
      reason,
    },
    ip_address: ipAddress,
    user_agent: userAgent,
    status: 'SUCCESS',
  });
}

/**
 * Log admin message sent
 */
export async function logAdminMessageSent(
  adminUserId: bigint,
  messageId: number,
  messageType: 'BROADCAST' | 'DIRECT',
  recipientCount: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditAction({
    user_id: adminUserId,
    action_type: 'ADMIN_MESSAGE_SENT',
    resource_type: 'MESSAGE',
    resource_id: messageId.toString(),
    description: `Admin sent ${messageType} message to ${recipientCount} recipient(s)`,
    details: {
      message_type: messageType,
      recipient_count: recipientCount,
    },
    ip_address: ipAddress,
    user_agent: userAgent,
    status: 'SUCCESS',
  });
}

/**
 * Log document access
 */
export async function logDocumentAccess(
  userId: bigint,
  documentId: number,
  departmentId: number,
  action: 'VIEW' | 'DOWNLOAD' | 'REFERENCE',
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditAction({
    user_id: userId,
    action_type: `FILE_${action}`,
    resource_type: 'FILE',
    resource_id: documentId.toString(),
    department_id: departmentId,
    description: `Document accessed: ${action}`,
    ip_address: ipAddress,
    user_agent: userAgent,
    status: 'SUCCESS',
  });
}

/**
 * Log admin action (file upload, user management, etc)
 */
export async function logAdminAction(
  adminUserId: bigint,
  actionType: string,
  resourceType: string,
  resourceId: string,
  description: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditAction({
    user_id: adminUserId,
    action_type: `ADMIN_${actionType}`,
    resource_type: resourceType,
    resource_id: resourceId,
    description: description,
    details: details,
    ip_address: ipAddress,
    user_agent: userAgent,
    status: 'SUCCESS',
  });
}

/**
 * Log failed operation for investigation
 */
export async function logFailedOperation(
  userId: bigint | undefined,
  actionType: string,
  resourceType: string,
  description: string,
  error: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditAction({
    user_id: userId,
    action_type: actionType,
    resource_type: resourceType,
    description: description,
    details: {
      error: error?.message || String(error),
      stack: error?.stack,
    },
    ip_address: ipAddress,
    user_agent: userAgent,
    status: 'FAILED',
  });
}
