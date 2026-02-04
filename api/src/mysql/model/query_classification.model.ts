import { DataTypes } from 'sequelize';
import seq from '@/mysql/db/seq.db';

/**
 * Query Classification History
 * Stores classification results for audit and analytics
 * 
 * Used for:
 * - Audit logging
 * - FAQ analytics
 * - Classification accuracy improvement
 */
const QueryClassification = seq.define(
  'query_classification',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    query_id: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: 'Task ID or query ID',
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: 'Reference to user.user_id',
    },
    original_query: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Original user query',
    },
    detected_language: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: 'Detected language (en, ja, etc)',
    },
    classified_department: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Reference to department.id - null if no department found',
    },
    classification_confidence: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      comment: 'Confidence score 0-100',
    },
    detected_keywords: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Keywords that influenced classification',
    },
    rag_triggered: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether RAG was triggered',
    },
    source_document_ids: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of document IDs used in answer',
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    tableName: 'query_classification',
    timestamps: false,
    freezeTableName: true,
    comment: 'Audit log for query classifications and RAG triggers',
  }
);

export default QueryClassification;
