/**
 * Triage and Department Types with RBAC Integration
 * Integrated with Aviary Platform RBAC system
 */

// ============================================
// AUTHENTICATION & IDENTITY TYPES
// ============================================

export interface IUser {
  userId: number;
  userName: string;
  email?: string;
  dept?: string;
  deptId?: number;
  avatar?: string;
  nickname?: string;
  status: 'active' | 'inactive' | 'locked';
  lastLoginTime?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface IRole {
  roleId: number;
  roleName: string;
  roleCode: string;
  description?: string;
  permissions: string[];
  dataScope: 'all' | 'dept' | 'deptAndChild' | 'self';
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface IMenu {
  menuId: number;
  menuName: string;
  path: string;
  component?: string;
  element?: string;
  icon?: string;
  orderNum: number;
  perms?: string;
  visible: 'show' | 'hide';
  type: 'menu' | 'button' | 'dir';
  status: 'active' | 'inactive';
  parentId?: number;
  children?: IMenu[];
  meta?: {
    title: string;
    icon?: string;
    hidden?: boolean;
    alwaysShow?: boolean;
  };
  created_at: Date;
  updated_at: Date;
}

export interface IPermission {
  permissionId: number;
  permissionCode: string;
  permissionName: string;
  description?: string;
  resource: string;
  action: string;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface IDept {
  deptId: number;
  deptName: string;
  parentId?: number;
  ancestors?: string;
  orderNum: number;
  leader?: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface IPost {
  postId: number;
  postName: string;
  postCode: string;
  postSort: number;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface IAuthToken {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshToken?: string;
}

export interface IAuthContext {
  user: IUser;
  roles: IRole[];
  permissions: string[];
  menus: IMenu[];
  dept: IDept;
  token: IAuthToken;
}

// ============================================
// TRIAGE AND CLASSIFICATION TYPES
// ============================================

export interface IClassificationResult {
  department: 'HR' | 'GA' | 'OTHER';
  deptId: number;
  confidence: number;
  language: 'EN' | 'JA';
  detectedKeywords: string[];
  reason: string;
  classifiedBy: number; // User ID
  classifiedAt: Date;
}

export interface IDepartment {
  id: number;
  code: string;
  name: string;
  deptId: number; // Link to system dept
  description?: string;
  admin_group_id?: number;
  admin_roles?: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// ESCALATION & TICKET TYPES
// ============================================

export interface IEscalationTicket {
  id: number;
  ticket_number: string;
  user_id: number;
  original_query: string;
  bot_answer?: string;
  source_documents?: any[];
  department_id: number;
  assigned_admin_id?: number;
  assigned_admin_name?: string;
  reason?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  resolution_notes?: string;
  resolved_at?: Date;
  resolved_by?: number;
  sla_deadline?: Date;
  created_at: Date;
  updated_at: Date;
  created_by: number;
}

// ============================================
// MESSAGING & COMMUNICATION TYPES
// ============================================

export interface IAdminMessage {
  id: number;
  sender_admin_id: number;
  sender_name?: string;
  message_type: 'BROADCAST' | 'DIRECT' | 'MENTION';
  recipient_user_id?: number;
  recipient_user_name?: string;
  recipient_department_id?: number;
  recipient_department_name?: string;
  recipient_role_ids?: number[];
  title: string;
  content: string;
  mentions?: number[];
  mention_names?: string[];
  is_pinned: boolean;
  is_read: boolean;
  read_at?: Date;
  expires_at?: Date;
  view_count: number;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// ANALYTICS & INSIGHTS TYPES
// ============================================

export interface IFAQAnalytics {
  id: number;
  department_id: number;
  department_name?: string;
  query_hash: string;
  normalized_query: string;
  query_language: 'EN' | 'JA';
  frequency: number;
  source_document_id?: number;
  answer_quality_score: number;
  is_faq_candidate: boolean;
  is_published: boolean;
  last_queried_at?: Date;
  avg_response_time?: number;
  user_satisfaction_score?: number;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// AUDIT & COMPLIANCE TYPES
// ============================================

export interface IAuditLog {
  id: bigint;
  user_id: number;
  user_name?: string;
  dept_id?: number;
  dept_name?: string;
  action_type: string;
  resource_type: string;
  resource_id?: string;
  description: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  response_time?: number;
  created_at: Date;
}

export interface IAuditOperation {
  userName: string;
  dept: string;
  userInfo?: {
    userName: string;
    dept: string;
  };
  machineInfo?: {
    ip: string;
    userAgent: string;
    browser?: string;
    os?: string;
  };
  result?: any;
  errorMessage?: string;
  routes?: any[];
}

// ============================================
// CONFIG & GOVERNANCE TYPES
// ============================================

export interface IConfig {
  configId: number;
  configName: string;
  configKey: string;
  configValue: string;
  configType?: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IDictType {
  dictId: number;
  dictName: string;
  dictType: string;
  status: 'active' | 'inactive';
  remark?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IDictData {
  dictCode: number;
  dictSort: number;
  dictLabel: string;
  dictValue: string;
  dictType: string;
  cssClass?: string;
  listClass?: string;
  isDefault: 'Y' | 'N';
  status: 'active' | 'inactive';
  remark?: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// REQUEST & RESPONSE TYPES
// ============================================

export interface IApiResponse<T = any> {
  code: number;
  msg: string;
  data?: T;
  timestamp?: string;
}

export interface IPageResult<T> {
  rows: T[];
  total: number;
  pageNum: number;
  pageSize: number;
}

// ============================================
// TASK & QUEUE TYPES
// ============================================

export interface IAsyncTask {
  taskId: string;
  taskType: 'chat' | 'chat-stream' | string;
  userId: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  input: any;
  output?: any;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface IChatTaskInput {
  query: string;
  userId: number;
  sessionId?: string;
  language?: 'EN' | 'JA';
  department?: 'HR' | 'GA' | 'OTHER';
  userId_dept?: string;
}

export interface IChatTaskOutput {
  answer: string;
  sources: any[];
  department: string;
  language: string;
  confidence: number;
  processingTime: number;
}
