/**
 * 権限リスト
 */
const PERMISSIONS = {
  CREATE: 'C',
  READ: 'R',
  UPDATE: 'U',
  DELETE: 'D',

  READ_ROLE: 'R|role',
  CREATE_ROLE: 'C|role',
  UPDATE_ROLE: 'U|role',
  DELETE_ROLE: 'D|role',

  READ_USER: 'R|user',
  CREATE_USER: 'C|user',
  UPDATE_USER: 'U|user',
  DELETE_USER: 'D|user',

  READ_MENU: 'R|menu',
  CREATE_MENU: 'C|menu',
  UPDATE_MENU: 'U|menu',
  DELETE_MENU: 'D|menu',

  // Escalation permissions
  ESCALATION_VIEW: 'R|escalation',
  ESCALATION_MANAGE: 'U|escalation',

  // Admin messaging permissions
  ADMIN_MESSAGE_VIEW: 'R|admin_message',
  ADMIN_MESSAGE_SEND: 'C|admin_message',

  // FAQ analytics permissions
  FAQ_VIEW: 'R|faq_analytics',
  FAQ_MANAGE: 'U|faq_analytics',

  // Department access control
  DEPARTMENT_VIEW: 'R|department',
  DEPARTMENT_MANAGE: 'U|department',

  // Audit log access
  AUDIT_VIEW: 'R|audit_log',

};

export default PERMISSIONS;
