/**
 * Department-Scoped RAG Service
 * 
 * CRITICAL:
 * - Enforces document access by department
 * - Filters RAG search results to classified department only
 * - Prevents cross-department document leakage
 * - Returns safe fallback if no relevant documents found
 */

import FileDepartment from '@/mysql/model/file_department.model';
import Department from '@/mysql/model/department.model';
import { sequelize } from '@/mysql/db/seq.db';

/**
 * Get accessible document IDs for a department
 * Returns array of document IDs the department can access
 */
export async function getAccessibleDocumentsForDepartment(
  departmentCode: 'HR' | 'GA' | 'OTHER'
): Promise<number[]> {
  try {
    // Find department
    const department = await Department.findOne({
      where: { code: departmentCode, is_active: true },
    });

    if (!department) {
      console.warn(`Department not found: ${departmentCode}`);
      return [];
    }

    // Get all files mapped to this department
    const fileDepartments = await FileDepartment.findAll({
      where: { department_id: (department as any).id },
      attributes: ['file_id'],
    });

    return fileDepartments.map((fd: any) => fd.file_id);
  } catch (error) {
    console.error('Error getting accessible documents:', error);
    return [];
  }
}

/**
 * Filter RAG search results to only include department-accessible documents
 * 
 * Expected RAG response format:
 * {
 *   results: [
 *     { document_id: 1, content: "...", ... },
 *     ...
 *   ]
 * }
 */
export function filterRAGResultsByDepartment(
  ragResults: any,
  accessibleDocumentIds: number[]
): any {
  if (!ragResults || !ragResults.results) {
    return { results: [] };
  }

  // Filter results to only include accessible documents
  const filtered = {
    ...ragResults,
    results: ragResults.results.filter((result: any) => {
      // Documents can be identified by document_id or file_id
      const docId = result.document_id || result.file_id;
      return accessibleDocumentIds.includes(docId);
    }),
  };

  return filtered;
}

/**
 * Check if user has access to a specific document
 */
export async function hasAccessToDocument(
  userId: bigint,
  documentId: number,
  departmentCode: string
): Promise<boolean> {
  try {
    const accessibleDocs = await getAccessibleDocumentsForDepartment(
      departmentCode as 'HR' | 'GA' | 'OTHER'
    );
    return accessibleDocs.includes(documentId);
  } catch (error) {
    console.error('Error checking document access:', error);
    return false;
  }
}

/**
 * Get safe fallback response when no relevant documents found
 */
export function getSafeFallbackResponse(department: 'HR' | 'GA' | 'OTHER'): string {
  const fallbacks: Record<string, string> = {
    HR: 'I apologize, but I could not find relevant HR policy documents to answer your question. Please contact the HR department directly for assistance.',
    GA: 'I apologize, but I could not find relevant General Affairs documentation. Please contact the GA department or facility management for help.',
    OTHER: 'I apologize, but I could not find relevant information to answer your question. Please reach out to the appropriate department for support.',
  };

  return fallbacks[department] || fallbacks.OTHER;
}

/**
 * Validate that RAG results are properly scoped
 * Returns true if all results belong to accessible documents
 */
export function validateRAGResultsScope(
  ragResults: any,
  accessibleDocumentIds: number[]
): boolean {
  if (!ragResults || !ragResults.results) {
    return true;
  }

  return ragResults.results.every((result: any) => {
    const docId = result.document_id || result.file_id;
    return accessibleDocumentIds.includes(docId);
  });
}

/**
 * Map department code to department ID
 */
export async function getDepartmentId(departmentCode: 'HR' | 'GA' | 'OTHER'): Promise<number | null> {
  try {
    const department = await Department.findOne({
      where: { code: departmentCode, is_active: true },
      attributes: ['id'],
    });
    return department ? (department as any).id : null;
  } catch (error) {
    console.error('Error getting department ID:', error);
    return null;
  }
}

/**
 * Map department ID to code
 */
export async function getDepartmentCode(departmentId: number): Promise<'HR' | 'GA' | 'OTHER' | null> {
  try {
    const department = await Department.findOne({
      where: { id: departmentId, is_active: true },
      attributes: ['code'],
    });
    return department ? (department as any).code : null;
  } catch (error) {
    console.error('Error getting department code:', error);
    return null;
  }
}

/**
 * Assign document to department(s)
 * Used during file upload
 */
export async function assignDocumentToDepartment(
  documentId: number,
  departmentCode: 'HR' | 'GA' | 'OTHER',
  isPrimary: boolean = true
): Promise<boolean> {
  try {
    const department = await Department.findOne({
      where: { code: departmentCode, is_active: true },
    });

    if (!department) {
      return false;
    }

    // Check if mapping already exists
    const existing = await FileDepartment.findOne({
      where: {
        file_id: documentId,
        department_id: (department as any).id,
      },
    });

    if (existing) {
      // Update if exists
      await (existing as any).update({ is_primary: isPrimary });
    } else {
      // Create new mapping
      await FileDepartment.create({
        file_id: documentId,
        department_id: (department as any).id,
        is_primary: isPrimary,
      });
    }

    return true;
  } catch (error) {
    console.error('Error assigning document to department:', error);
    return false;
  }
}
