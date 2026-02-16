/**
 * Escalation Pipeline Service
 * 
 * Handles escalation of unsatisfied queries to appropriate department admins
 * Includes:
 * - Escalation ticket creation
 * - Admin routing (HR, GA, or General)
 * - Audit logging
 */

import Escalation from '@/mysql/model/escalation.model';
import Department from '@/mysql/model/department.model';
import User from '@/mysql/model/user.model';
import { nanoid } from 'nanoid';
import { IEscalationTicket } from '@/types/triage';
import { logEscalation } from '@/service/auditService';

interface IEscalationInput {
  user_id: bigint;
  original_query: string;
  bot_answer: string;
  source_documents: any[];
  department?: 'HR' | 'GA' | 'OTHER';
  department_id?: number;
  reason?: string;
  created_by?: bigint;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an escalation ticket
 * Routes to appropriate department admin
 */
export async function createEscalationTicket(
  input: IEscalationInput
): Promise<IEscalationTicket> {
  try {
    if (!input.department && !input.department_id) {
      throw new Error('Either department or department_id is required');
    }

    // Resolve target department by code or id.
    const department = await Department.findOne({
      where: input.department
        ? { code: input.department, is_active: true }
        : { id: input.department_id, is_active: true },
    });

    if (!department) {
      throw new Error(
        `Invalid department: ${input.department || input.department_id}`
      );
    }

    const departmentId = (department as any).id;
    const ticketNumber = generateTicketNumber();

    // Create escalation
    const escalation = await Escalation.create({
      ticket_number: ticketNumber,
      user_id: input.user_id,
      original_query: input.original_query,
      bot_answer: input.bot_answer,
      source_documents: input.source_documents,
      department_id: departmentId,
      reason: input.reason,
      status: 'OPEN',
    });

    // Log the escalation
    await logEscalation(
      input.user_id,
      (escalation as any).id,
      ticketNumber,
      departmentId,
      input.reason || 'User initiated escalation',
      input.ipAddress,
      input.userAgent
    );

    return (escalation as any).toJSON() as IEscalationTicket;
  } catch (error) {
    console.error('Error creating escalation ticket:', error);
    throw error;
  }
}

/**
 * Get escalations for a department
 * Used by department admins to view open escalations
 */
export async function getEscalationsForDepartment(
  departmentId: number,
  status?: string,
  limit: number = 20
): Promise<IEscalationTicket[]> {
  try {
    const where: any = { department_id: departmentId };
    if (status) {
      where.status = status;
    }

    const escalations = await Escalation.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
    });

    return escalations.map((e: any) => e.toJSON() as IEscalationTicket);
  } catch (error) {
    console.error('Error fetching escalations:', error);
    return [];
  }
}

/**
 * Assign escalation to an admin
 */
export async function assignEscalationToAdmin(
  escalationId: number,
  adminUserId: bigint
): Promise<boolean> {
  try {
    const escalation = await Escalation.findByPk(escalationId);
    if (!escalation) {
      return false;
    }

    await (escalation as any).update({
      assigned_admin_id: adminUserId,
      status: 'IN_PROGRESS',
    });

    return true;
  } catch (error) {
    console.error('Error assigning escalation:', error);
    return false;
  }
}

/**
 * Resolve an escalation with admin response
 */
export async function resolveEscalation(
  escalationId: number,
  adminUserId: bigint,
  resolutionNotes: string
): Promise<boolean> {
  try {
    const escalation = await Escalation.findByPk(escalationId);
    if (!escalation) {
      return false;
    }

    await (escalation as any).update({
      status: 'RESOLVED',
      resolution_notes: resolutionNotes,
      resolved_at: new Date(),
    });

    return true;
  } catch (error) {
    console.error('Error resolving escalation:', error);
    return false;
  }
}

/**
 * Get admin group for department escalation routing
 * Returns list of admin user IDs for the department
 */
export async function getDepartmentAdmins(
  departmentId: number
): Promise<bigint[]> {
  try {
    const department = await Department.findByPk(departmentId);
    if (!department) {
      return [];
    }

    const adminGroupId = (department as any).admin_group_id;
    if (!adminGroupId) {
      return [];
    }

    // Query for admins in the group (would need to join with user_group table)
    // This assumes a user_group relationship exists
    // For now, returning empty - should be connected to group membership
    // const users = await User.findAll({
    //   include: [{ association: 'groups', where: { id: adminGroupId } }],
    // });
    // return users.map(u => u.user_id);

    return [];
  } catch (error) {
    console.error('Error getting department admins:', error);
    return [];
  }
}

/**
 * Generate unique ticket number
 * Format: ESC-TIMESTAMP-RANDOM (e.g., ESC-1707032400-a7k9)
 */
function generateTicketNumber(): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const random = nanoid(4).toLowerCase();
  return `ESC-${timestamp}-${random}`;
}

/**
 * Get escalation by ticket number
 */
export async function getEscalationByTicketNumber(
  ticketNumber: string
): Promise<IEscalationTicket | null> {
  try {
    const escalation = await Escalation.findOne({
      where: { ticket_number: ticketNumber },
    });

    return escalation ? ((escalation as any).toJSON() as IEscalationTicket) : null;
  } catch (error) {
    console.error('Error fetching escalation:', error);
    return null;
  }
}

/**
 * Get escalation stats for dashboard
 */
export async function getEscalationStats(): Promise<{
  total_open: number;
  total_in_progress: number;
  total_resolved: number;
  by_department: Record<string, number>;
  average_resolution_time_hours: number;
}> {
  try {
    // Open tickets
    const openCount = await Escalation.count({
      where: { status: 'OPEN' },
    });

    const inProgressCount = await Escalation.count({
      where: { status: 'IN_PROGRESS' },
    });

    const resolvedCount = await Escalation.count({
      where: { status: 'RESOLVED' },
    });

    // By department (requires query)
    const byDeptRaw = await (Escalation as any).findAll({
      attributes: [
        'department_id',
        [(Escalation as any).sequelize.fn('COUNT', Escalation as any), 'count'],
      ],
      group: ['department_id'],
    });

    const byDepartment: Record<string, number> = {};
    for (const row of byDeptRaw) {
      const dept = await Department.findByPk((row as any).department_id);
      if (dept) {
        byDepartment[(dept as any).code] = (row as any).dataValues.count;
      }
    }

    // Average resolution time
    const resolvedTickets = await Escalation.findAll({
      where: { status: 'RESOLVED', resolved_at: { ['>=']: new Date() } },
      attributes: ['created_at', 'resolved_at'],
    });

    let avgResolutionMs = 0;
    if (resolvedTickets.length > 0) {
      const totalMs = resolvedTickets.reduce((sum, ticket: any) => {
        const ticketData = ticket.toJSON();
        const createdAt = new Date(ticketData.created_at).getTime();
        const resolvedAt = new Date(ticketData.resolved_at).getTime();
        return sum + (resolvedAt - createdAt);
      }, 0);
      avgResolutionMs = totalMs / resolvedTickets.length;
    }

    return {
      total_open: openCount,
      total_in_progress: inProgressCount,
      total_resolved: resolvedCount,
      by_department: byDepartment,
      average_resolution_time_hours: Math.round(avgResolutionMs / (1000 * 60 * 60)),
    };
  } catch (error) {
    console.error('Error getting escalation stats:', error);
    return {
      total_open: 0,
      total_in_progress: 0,
      total_resolved: 0,
      by_department: {},
      average_resolution_time_hours: 0,
    };
  }
}
