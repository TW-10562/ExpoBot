import { DataTypes } from 'sequelize';
import seq from '@/mysql/db/seq.db';

/**
 * FAQ Analytics Model
 * Tracks query frequency and patterns for FAQ recommendation
 */
const FAQAnalytics = seq.define(
  'faq_analytics',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Department for this FAQ',
    },
    query_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: 'SHA256 hash of normalized query',
    },
    normalized_query: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Normalized query text for deduplication',
    },
    query_language: {
      type: DataTypes.STRING(10),
      defaultValue: 'en',
      comment: 'Primary language of queries',
    },
    frequency: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Number of times this query was asked',
    },
    source_document_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Most commonly used source document',
    },
    answer_quality_score: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      comment: 'Average user satisfaction 0-100',
    },
    is_faq_candidate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this query should be promoted to FAQ',
    },
    last_queried_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When this query pattern was last asked',
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
    tableName: 'faq_analytics',
    timestamps: true,
    freezeTableName: true,
    indexes: [
      {
        fields: ['department_id', 'frequency'],
      },
      {
        fields: ['is_faq_candidate', 'frequency'],
      },
    ],
    comment: 'FAQ analytics and recommendation engine',
  }
);

export default FAQAnalytics;
