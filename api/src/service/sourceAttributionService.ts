/**
 * Source Attribution Service
 * 
 * CRITICAL:
 * - Every answer must include document source attribution
 * - Sources must be clickable links to document viewer
 * - Source metadata comes from RAG, not guessed
 * - Audit all document access through sources
 */

import File from '@/mysql/model/file.model';
import { logDocumentAccess } from '@/service/auditService';

interface ISourceDocument {
  id: number;
  filename: string;
  storage_key: string;
  mime_type: string;
  size: number;
  created_at: Date;
}

interface IAttributedAnswer {
  answer: string;
  sources: ISourceDocument[];
  source_text: string; // Formatted source attribution text
  source_html: string; // Formatted HTML with clickable links
}

/**
 * Attach source attribution to an answer
 * 
 * Input:
 * - answer: Generated answer text
 * - sourceDocumentIds: Array of document IDs used in RAG
 * 
 * Output:
 * - answer: Original answer
 * - sources: Document metadata
 * - source_text: Formatted text for display (plain)
 * - source_html: Formatted HTML with links
 */
export async function attachSourceAttribution(
  answer: string,
  sourceDocumentIds: number[],
  userId?: bigint,
  departmentId?: number
): Promise<IAttributedAnswer> {
  try {
    // Fetch document metadata
    const documents = await File.findAll({
      where: { id: sourceDocumentIds },
      attributes: ['id', 'filename', 'storage_key', 'mime_type', 'size', 'created_at'],
    });

    if (documents.length === 0) {
      return {
        answer,
        sources: [],
        source_text: '',
        source_html: '',
      };
    }

    const sources = documents.map((doc: any) => ({
      id: doc.id,
      filename: doc.filename,
      storage_key: doc.storage_key,
      mime_type: doc.mime_type,
      size: doc.size,
      created_at: doc.created_at,
    }));

    // Log document access for each source
    if (userId && departmentId) {
      for (const source of sources) {
        await logDocumentAccess(userId, source.id, departmentId, 'REFERENCE');
      }
    }

    // Format source text
    const sourceText = formatSourceText(sources);
    const sourceHtml = formatSourceHtml(sources);

    return {
      answer,
      sources,
      source_text: sourceText,
      source_html: sourceHtml,
    };
  } catch (error) {
    console.error('Error attaching source attribution:', error);
    return {
      answer,
      sources: [],
      source_text: '',
      source_html: '',
    };
  }
}

/**
 * Format sources as plain text
 * Example: [SOURCE: Policy Document, HR Handbook]
 */
function formatSourceText(sources: ISourceDocument[]): string {
  if (sources.length === 0) {
    return '';
  }

  const sourceNames = sources.map(s => s.filename).join(', ');
  return `[SOURCE: ${sourceNames}]`;
}

/**
 * Format sources as HTML with links
 * Example: <p><strong>Sources:</strong></p>
 *          <ul>
 *            <li><a href="/api/file/preview/1">Policy Document</a></li>
 *            <li><a href="/api/file/preview/2">HR Handbook</a></li>
 *          </ul>
 */
function formatSourceHtml(sources: ISourceDocument[]): string {
  if (sources.length === 0) {
    return '';
  }

  const sourceLinks = sources
    .map(s => `<li><a href="/api/file/preview/${s.id}" target="_blank">${escapeHtml(s.filename)}</a></li>`)
    .join('\n');

  return `
<div class="sources-attribution">
  <p><strong>Sources:</strong></p>
  <ul>
    ${sourceLinks}
  </ul>
</div>
  `.trim();
}

/**
 * Escape HTML special characters for safe display
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * Extract document IDs from RAG response
 * Different RAG formats may use different field names
 */
export function extractDocumentIdsFromRAG(ragResponse: any): number[] {
  const documentIds = new Set<number>();

  if (!ragResponse) {
    return [];
  }

  // Common field names in RAG responses
  const fieldNames = ['document_id', 'file_id', 'id', 'source_id', 'doc_id'];
  const arrayFieldNames = ['documents', 'results', 'sources', 'hits'];

  // Check if response is an array of results
  if (Array.isArray(ragResponse)) {
    for (const item of ragResponse) {
      for (const field of fieldNames) {
        if (item[field] && typeof item[field] === 'number') {
          documentIds.add(item[field]);
        }
      }
    }
  } else if (typeof ragResponse === 'object') {
    // Check array fields
    for (const arrayField of arrayFieldNames) {
      if (Array.isArray(ragResponse[arrayField])) {
        for (const item of ragResponse[arrayField]) {
          for (const field of fieldNames) {
            if (item[field] && typeof item[field] === 'number') {
              documentIds.add(item[field]);
            }
          }
        }
      }
    }

    // Check top-level fields
    for (const field of fieldNames) {
      if (ragResponse[field] && typeof ragResponse[field] === 'number') {
        documentIds.add(ragResponse[field]);
      }
    }
  }

  return Array.from(documentIds);
}

/**
 * Validate source documents exist and are accessible
 */
export async function validateSources(
  documentIds: number[],
  accessibleDocumentIds: number[]
): Promise<boolean> {
  // All documents must be in accessible list
  return documentIds.every(id => accessibleDocumentIds.includes(id));
}

/**
 * Get document preview URL
 */
export function getDocumentPreviewUrl(documentId: number): string {
  return `/api/file/preview/${documentId}`;
}

/**
 * Get download URL for document
 */
export function getDocumentDownloadUrl(documentId: number): string {
  return `/api/file/download/${documentId}`;
}
