import { DataTypes } from 'sequelize';
import seq from '@/mysql/db/seq.db';

/**
 * File Department Mapping
 * Links files/documents to departments for access control
 * 
 * Ensures documents are only searched in the correct department context
 */
const FileDepartment = seq.define(
  'file_department',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    file_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Reference to file.id',
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Reference to department.id',
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this is the primary department for the document',
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    tableName: 'file_department',
    timestamps: false,
    freezeTableName: true,
    comment: 'Maps files to departments for access control',
  }
);

export default FileDepartment;
