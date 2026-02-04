import { DataTypes } from 'sequelize';
import seq from '@/mysql/db/seq.db';

/**
 * Escalation Ticket Model
 * Stores escalated queries with tracking and resolution
 */
const Escalation = seq.define(
  'escalation',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ticket_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Unique ticket identifier',
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: 'Reference to user.user_id - who escalated',
    },
    original_query: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Original query that prompted escalation',
    },
    bot_answer: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Answer provided by bot',
    },
    source_documents: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of document sources used',
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Department responsible for resolution',
    },
    assigned_admin_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'Admin assigned to handle escalation',
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for escalation',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'OPEN',
      comment: 'OPEN, IN_PROGRESS, RESOLVED, CLOSED',
    },
    resolution_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Admin resolution notes',
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When escalation was resolved',
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    tableName: 'escalation',
    timestamps: true,
    freezeTableName: true,
    indexes: [
      {
        fields: ['department_id', 'status'],
      },
      {
        fields: ['assigned_admin_id', 'status'],
      },
    ],
    comment: 'Escalation tickets for unresolved queries',
  }
);

export default Escalation;
