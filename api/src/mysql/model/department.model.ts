import { DataTypes } from 'sequelize';
import seq from '@/mysql/db/seq.db';

/**
 * Department Model
 * Stores department definitions for document scoping and query triage
 * 
 * Departments:
 * - HR: Human Resources
 * - GA: General Affairs
 * - Other: Default/other queries
 */
const Department = seq.define(
  'department',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Department code (HR, GA, Other)',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Department name',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Department description',
    },
    admin_group_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Admin group ID for escalation routing',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether department is active',
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
    tableName: 'department',
    timestamps: true,
    freezeTableName: true,
    comment: 'Department definitions for document scoping',
  }
);

export default Department;
