/**
 * Department Triage Agent Service
 * 
 * Classifies user queries into departments (HR, GA, Other)
 * Uses keyword matching, LLM analysis, and historical patterns
 * 
 * CRITICAL:
 * - Classification happens BEFORE RAG
 * - Result controls document access scope
 * - No cross-department document leakage allowed
 * - All classifications must be audited
 */

import { IClassificationResult } from '@/types/triage';

// Keywords mapping for department classification
const DEPARTMENT_KEYWORDS = {
  HR: {
    primary: [
      'leave', 'vacation', 'holiday', 'absence', 'vacation day', 'pto', 'time off',
      'salary', 'wage', 'payment', 'bonus', 'allowance', 'compensation', 'payroll',
      'benefit', 'insurance', 'health insurance', 'medical', 'dental', 'vision',
      'training', 'development', 'course', 'certification', 'education',
      'promotion', 'appraisal', 'evaluation', 'performance review', 'raise',
      'contract', 'employment', 'resignation', 'retirement', 'termination',
      'maternity', 'paternity', 'parental', 'bereavement', 'sick',
      'onboarding', 'offboarding', 'induction', 'orientation', 'probation',
      'harassment', 'discrimination', 'misconduct', 'disciplinary',
    ],
    secondary: [
      'paycheck', 'payslip', 'salary increase', 'annual leave', 'work visa',
      'pension', 'pension plan', 'retirement plan', 'gratuity',
      'hr policy', 'employee handbook', 'code of conduct',
      'hr department', 'human resources', 'peopleops',
    ]
  },
  GA: {
    primary: [
      'office', 'facility', 'workspace', 'building', 'floor', 'desk',
      'meeting room', 'conference room', 'cafeteria', 'parking',
      'transportation', 'commute', 'shuttle', 'traffic',
      'supplies', 'equipment', 'laptop', 'computer', 'phone', 'access card',
      'maintenance', 'repair', 'broken', 'damaged', 'cleanliness',
      'environment', 'temperature', 'noise', 'lighting', 'ergonomics',
      'mail', 'document', 'filing', 'records', 'storage',
      'contact', 'phone directory', 'internal directory',
    ],
    secondary: [
      'facilities management', 'general affairs', 'administration',
      'office management', 'corporate services', 'workplace',
      'building access', 'id card', 'security badge',
      'employee expense', 'reimbursement', 'allowance',
      'company event', 'team building', 'office party',
    ]
  }
};

/**
 * Score text against department keywords
 * Returns score 0-100
 */
function scoreAgainstDepartment(
  text: string,
  keywords: { primary: string[]; secondary: string[] }
): number {
  const lowerText = text.toLowerCase();
  let score = 0;

  // Primary keywords: higher weight
  for (const keyword of keywords.primary) {
    if (lowerText.includes(keyword)) {
      score += 15;
    }
  }

  // Secondary keywords: lower weight
  for (const keyword of keywords.secondary) {
    if (lowerText.includes(keyword)) {
      score += 5;
    }
  }

  // Normalize to 0-100
  return Math.min(100, score);
}

/**
 * Detect language from text
 * Simple heuristic: Japanese text contains hiragana/katakana/kanji
 */
function detectLanguage(text: string): 'en' | 'ja' {
  // Japanese character ranges
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g;
  const japaneseChars = text.match(japaneseRegex) || [];
  
  // If >20% of text is Japanese characters, classify as Japanese
  if (japaneseChars.length / text.length > 0.2) {
    return 'ja';
  }
  return 'en';
}

/**
 * Extract keywords that influenced classification
 */
function extractDetectedKeywords(
  text: string,
  keywords: { primary: string[]; secondary: string[] }
): string[] {
  const lowerText = text.toLowerCase();
  const detected: string[] = [];

  for (const keyword of [...keywords.primary, ...keywords.secondary]) {
    if (lowerText.includes(keyword)) {
      detected.push(keyword);
    }
  }

  return detected.slice(0, 10); // Top 10 keywords
}

/**
 * Classify a query into a department
 * 
 * Returns:
 * - department: 'HR', 'GA', or 'OTHER'
 * - confidence: 0-100
 * - keywords: detected keywords
 * - language: 'en' or 'ja'
 */
export async function classifyQuery(query: string): Promise<IClassificationResult> {
  const language = detectLanguage(query);
  
  // Score against each department
  const hrScore = scoreAgainstDepartment(query, DEPARTMENT_KEYWORDS.HR);
  const gaScore = scoreAgainstDepartment(query, DEPARTMENT_KEYWORDS.GA);

  // Determine primary classification
  let department: 'HR' | 'GA' | 'OTHER';
  let confidence: number;
  let keywords: string[] = [];

  if (hrScore > gaScore && hrScore > 20) {
    department = 'HR';
    confidence = hrScore;
    keywords = extractDetectedKeywords(query, DEPARTMENT_KEYWORDS.HR);
  } else if (gaScore > 20) {
    department = 'GA';
    confidence = gaScore;
    keywords = extractDetectedKeywords(query, DEPARTMENT_KEYWORDS.GA);
  } else {
    department = 'OTHER';
    confidence = 0;
    keywords = [];
  }

  return {
    department,
    confidence,
    language,
    detectedKeywords: keywords,
    reason: getClassificationReason(department, confidence, keywords),
  };
}

/**
 * Generate human-readable reason for classification
 */
function getClassificationReason(
  department: 'HR' | 'GA' | 'OTHER',
  confidence: number,
  keywords: string[]
): string {
  if (department === 'OTHER') {
    return 'Query does not match HR or GA patterns';
  }

  const deptName = department === 'HR' ? 'Human Resources' : 'General Affairs';
  const keywordStr = keywords.slice(0, 3).join(', ');
  
  if (confidence > 50) {
    return `Strong match for ${deptName} (keywords: ${keywordStr})`;
  } else if (confidence > 20) {
    return `Likely ${deptName} query (keywords: ${keywordStr})`;
  } else {
    return `Weak match for ${deptName}`;
  }
}

export interface IClassificationResult {
  department: 'HR' | 'GA' | 'OTHER';
  confidence: number;
  language: 'en' | 'ja';
  detectedKeywords: string[];
  reason: string;
}
