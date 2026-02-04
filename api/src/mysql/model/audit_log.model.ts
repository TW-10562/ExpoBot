import { DataTypes } from 'sequelize';
import seq from '@/mysql/db/seq.db';

/**
 * Audit Log Model
 * Comprehensive audit trail for security and compliance
 * 
 * Logs:
 * - Query execution
 * - Answer generation
 * - Admin actions
 * - Document access
 * - Escalations
 */
const AuditLog = seq.define(
  'audit_log',
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'Reference to user.user_id - null for system actions',
    },
    action_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Type of action (QUERY, ANSWER, ESCALATE, FILE_ACCESS, ADMIN_ACTION, etc)',
    },
    resource_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Type of resource (TASK, FILE, ESCALATION, MESSAGE, etc)',
    },
    resource_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'ID of affected resource',
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Department involved in action',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Action description',
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional details in JSON',
    },
    ip_address: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Client IP address',
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User agent string',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'SUCCESS',
      comment: 'SUCCESS, FAILED, PARTIAL',
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    tableName: 'audit_log',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        fields: ['user_id', 'created_at'],
        comment: 'For user activity queries',
      },
      {
        fields: ['department_id', 'created_at'],
        comment: 'For department audit queries',
      },
      {
        fields: ['action_type', 'created_at'],
        comment: 'For action type queries',
      },
    ],
    comment: 'Comprehensive audit trail for security and compliance',
  }
);

export default AuditLog;
