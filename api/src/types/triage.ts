/**
 * Triage and Department Types
 */

export interface IClassificationResult {
  department: 'HR' | 'GA' | 'OTHER';
  confidence: number;
  language: 'en' | 'ja';
  detectedKeywords: string[];
  reason: string;
}

export interface IDepartment {
  id: number;
  code: string;
  name: string;
  description?: string;
  admin_group_id?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface IEscalationTicket {
  id: number;
  ticket_number: string;
  user_id: bigint;
  original_query: string;
  bot_answer?: string;
  source_documents?: any[];
  department_id: number;
  assigned_admin_id?: bigint;
  reason?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  resolution_notes?: string;
  resolved_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface IAdminMessage {
  id: number;
  sender_admin_id: bigint;
  message_type: 'BROADCAST' | 'DIRECT';
  recipient_user_id?: bigint;
  recipient_department_id?: number;
  title: string;
  content: string;
  mentions?: bigint[];
  is_pinned: boolean;
  is_read: boolean;
  read_at?: Date;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface IFAQAnalytics {
  id: number;
  department_id: number;
  query_hash: string;
  normalized_query: string;
  query_language: string;
  frequency: number;
  source_document_id?: number;
  answer_quality_score: number;
  is_faq_candidate: boolean;
  last_queried_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface IAuditLog {
  id: bigint;
  user_id?: bigint;
  action_type: string;
  resource_type: string;
  resource_id?: string;
  department_id?: number;
  description: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  created_at: Date;
}
