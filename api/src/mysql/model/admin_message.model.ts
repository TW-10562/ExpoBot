import { DataTypes } from 'sequelize';
import seq from '@/mysql/db/seq.db';

/**
 * Admin Message Model
 * Supports broadcast and direct messaging to users
 */
const AdminMessage = seq.define(
  'admin_message',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sender_admin_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: 'Reference to admin user.user_id',
    },
    message_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'BROADCAST or DIRECT',
    },
    recipient_user_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'For DIRECT messages, reference to user.user_id',
    },
    recipient_department_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'For department-scoped broadcasts',
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: 'Message title',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Message content (supports @mentions)',
    },
    mentions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of mentioned user IDs',
    },
    is_pinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether message is pinned for prominence',
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Read status (for DIRECT messages)',
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When message was read',
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When message expires and is archived',
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
    tableName: 'admin_message',
    timestamps: true,
    freezeTableName: true,
    indexes: [
      {
        fields: ['recipient_user_id', 'is_read'],
      },
      {
        fields: ['sender_admin_id', 'created_at'],
      },
      {
        fields: ['recipient_department_id', 'created_at'],
      },
    ],
    comment: 'Admin messages (broadcast and direct)',
  }
);

export default AdminMessage;
