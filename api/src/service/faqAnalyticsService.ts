/**
 * FAQ Analytics and Recommendation Service
 * 
 * Tracks:
 * - Query frequency by department
 * - FAQ candidate identification
 * - Answer quality scores
 * - Query pattern analysis
 * 
 * Provides:
 * - FAQ recommendations for users
 * - Analytics dashboard for admins
 * - Query trend analysis
 */

import FAQAnalytics from '@/mysql/model/faq_analytics.model';
import QueryClassification from '@/mysql/model/query_classification.model';
import { IFAQAnalytics } from '@/types/triage';
import crypto from 'crypto';

interface IFAQRecommendation {
  query: string;
  frequency: number;
  document_name?: string;
  quality_score: number;
}

/**
 * Track a query for FAQ analytics
 * Called after every query is processed
 */
export async function trackQueryForAnalytics(
  departmentId: number,
  query: string,
  language: string,
  sourceDocumentId?: number,
  qualityScore: number = 50
): Promise<void> {
  try {
    // Normalize query for deduplication
    const normalizedQuery = normalizeQuery(query);
    const queryHash = crypto.createHash('sha256').update(normalizedQuery).digest('hex');

    // Check if this query pattern exists
    const existing = await FAQAnalytics.findOne({
      where: {
        department_id: departmentId,
        query_hash: queryHash,
      },
    });

    if (existing) {
      // Update existing record
      await (existing as any).update({
        frequency: (existing as any).frequency + 1,
        last_queried_at: new Date(),
        answer_quality_score: (
          ((existing as any).answer_quality_score * (existing as any).frequency + qualityScore) /
          ((existing as any).frequency + 1)
        ),
        source_document_id: sourceDocumentId || (existing as any).source_document_id,
        is_faq_candidate:
          (existing as any).frequency + 1 >= 3, // 3+ queries = FAQ candidate
      });
    } else {
      // Create new record
      await FAQAnalytics.create({
        department_id: departmentId,
        query_hash: queryHash,
        normalized_query: normalizedQuery,
        query_language: language,
        frequency: 1,
        source_document_id: sourceDocumentId,
        answer_quality_score: qualityScore,
        is_faq_candidate: false, // Becomes FAQ after 3 queries
        last_queried_at: new Date(),
      });
    }
  } catch (error) {
    console.error('Error tracking query for analytics:', error);
  }
}

/**
 * Get FAQ recommendations for a user
 * Shows frequently asked questions while user types
 */
export async function getFAQRecommendations(
  departmentId: number,
  partialQuery: string,
  limit: number = 5
): Promise<IFAQRecommendation[]> {
  try {
    const recommendations = await FAQAnalytics.findAll({
      where: {
        department_id: departmentId,
        is_faq_candidate: true,
      },
      order: [['frequency', 'DESC']],
      limit: limit * 2, // Get extra to filter
    });

    // Filter by partial query match
    const filtered = recommendations.filter((rec: any) => {
      const recData = rec.toJSON();
      return recData.normalized_query.includes(partialQuery.toLowerCase());
    });

    return filtered.slice(0, limit).map((rec: any) => {
      const recData = rec.toJSON();
      return {
        query: recData.normalized_query,
        frequency: recData.frequency,
        quality_score: recData.answer_quality_score,
      };
    });
  } catch (error) {
    console.error('Error getting FAQ recommendations:', error);
    return [];
  }
}

/**
 * Get top FAQs by department
 */
export async function getTopFAQsByDepartment(
  departmentId: number,
  limit: number = 10
): Promise<IFAQAnalytics[]> {
  try {
    const faqs = await FAQAnalytics.findAll({
      where: {
        department_id: departmentId,
        is_faq_candidate: true,
      },
      order: [['frequency', 'DESC']],
      limit,
    });

    return faqs.map((f: any) => f.toJSON() as IFAQAnalytics);
  } catch (error) {
    console.error('Error getting top FAQs:', error);
    return [];
  }
}

/**
 * Update answer quality score
 * Called when user provides feedback on answer
 */
export async function updateAnswerQualityScore(
  departmentId: number,
  query: string,
  qualityScore: number
): Promise<void> {
  try {
    const normalizedQuery = normalizeQuery(query);
    const queryHash = crypto.createHash('sha256').update(normalizedQuery).digest('hex');

    const record = await FAQAnalytics.findOne({
      where: {
        department_id: departmentId,
        query_hash: queryHash,
      },
    });

    if (record) {
      // Calculate new average score
      const oldScore = (record as any).answer_quality_score;
      const oldFrequency = (record as any).frequency;
      const newScore = (oldScore * oldFrequency + qualityScore) / (oldFrequency + 1);

      await (record as any).update({
        answer_quality_score: newScore,
      });
    }
  } catch (error) {
    console.error('Error updating quality score:', error);
  }
}

/**
 * Get FAQ analytics dashboard data
 */
export async function getFAQAnalyticsDashboard(
  departmentId?: number
): Promise<{
  total_queries_tracked: number;
  faq_candidates: number;
  average_quality_score: number;
  top_queries: IFAQAnalytics[];
  trending_queries: IFAQAnalytics[];
  low_quality_queries: IFAQAnalytics[];
}> {
  try {
    const where = departmentId ? { department_id: departmentId } : {};

    // Total tracked queries
    const totalTracked = await FAQAnalytics.count({ where });

    // FAQ candidates
    const faqCandidates = await FAQAnalytics.count({
      where: { ...where, is_faq_candidate: true },
    });

    // Average quality score
    const avgQualityRaw = await (FAQAnalytics as any).findAll({
      where,
      attributes: [
        [(FAQAnalytics as any).sequelize.fn('AVG', FAQAnalytics as any), 'avg_quality'],
      ],
    });

    const avgQuality =
      avgQualityRaw.length > 0 ? (avgQualityRaw[0] as any).dataValues.avg_quality : 0;

    // Top queries
    const topQueries = await FAQAnalytics.findAll({
      where,
      order: [['frequency', 'DESC']],
      limit: 10,
    });

    // Trending (recent activity)
    const trending = await FAQAnalytics.findAll({
      where,
      order: [['last_queried_at', 'DESC']],
      limit: 10,
    });

    // Low quality queries
    const lowQuality = await FAQAnalytics.findAll({
      where: { ...where, answer_quality_score: { ['<']: 40 } },
      order: [['frequency', 'DESC']],
      limit: 10,
    });

    return {
      total_queries_tracked: totalTracked,
      faq_candidates: faqCandidates,
      average_quality_score: Math.round(avgQuality * 100) / 100,
      top_queries: topQueries.map((q: any) => q.toJSON() as IFAQAnalytics),
      trending_queries: trending.map((q: any) => q.toJSON() as IFAQAnalytics),
      low_quality_queries: lowQuality.map((q: any) => q.toJSON() as IFAQAnalytics),
    };
  } catch (error) {
    console.error('Error getting FAQ analytics dashboard:', error);
    return {
      total_queries_tracked: 0,
      faq_candidates: 0,
      average_quality_score: 0,
      top_queries: [],
      trending_queries: [],
      low_quality_queries: [],
    };
  }
}

/**
 * Normalize query for consistent matching
 * - Lowercase
 * - Remove extra whitespace
 * - Remove punctuation
 */
function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:]/g, '');
}

/**
 * Promote query to FAQ manually (admin action)
 */
export async function promoteToFAQ(departmentId: number, query: string): Promise<boolean> {
  try {
    const normalizedQuery = normalizeQuery(query);
    const queryHash = crypto.createHash('sha256').update(normalizedQuery).digest('hex');

    const record = await FAQAnalytics.findOne({
      where: {
        department_id: departmentId,
        query_hash: queryHash,
      },
    });

    if (record) {
      await (record as any).update({ is_faq_candidate: true });
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error promoting to FAQ:', error);
    return false;
  }
}

/**
 * Demote query from FAQ
 */
export async function demoteFromFAQ(departmentId: number, query: string): Promise<boolean> {
  try {
    const normalizedQuery = normalizeQuery(query);
    const queryHash = crypto.createHash('sha256').update(normalizedQuery).digest('hex');

    const record = await FAQAnalytics.findOne({
      where: {
        department_id: departmentId,
        query_hash: queryHash,
      },
    });

    if (record) {
      await (record as any).update({ is_faq_candidate: false });
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error demoting from FAQ:', error);
    return false;
  }
}
