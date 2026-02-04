# Enterprise QA Bot - Code Integration Guide

## How to Integrate with Existing Chat Flow

### Step 1: Update Chat Task Processing

In your existing `chatTask.ts` or wherever RAG is called:

```typescript
import { processChatTask, handleEscalationRequest, processFeedback } from '@/service/enhancedChatTaskService';
import { trackQueryForAnalytics } from '@/service/faqAnalyticsService';

// OLD WAY (don't do this anymore):
// const answer = await ragService.search(query);
// const result = await llm.generate(answer);

// NEW WAY:
export async function enhancedChatFlow(
  taskId: string,
  userId: bigint,
  query: string,
  ipAddress?: string,
  userAgent?: string
) {
  // This handles everything: classification, scoping, RAG, logging
  const result = await processChatTask({
    taskId,
    userId,
    query,
    ipAddress,
    userAgent
  });

  return {
    answer: result.answer,
    sources: result.sourceAttribution,
    department: result.classifiedDepartment,
    language: result.detectedLanguage,
    faqRecommendations: result.faqRecommendations,
    // Allow user to escalate if unsatisfied
    canEscalate: true,
    escalationUrl: `/escalation/${taskId}`,
  };
}
```

### Step 2: Add Escalation Handling

```typescript
// When user clicks "Not satisfied" or "Escalate"
export async function escalateQuery(
  taskId: string,
  userId: bigint,
  originalQuery: string,
  botAnswer: string,
  department: 'HR' | 'GA' | 'OTHER',
  reason?: string
) {
  const { ticketNumber, escalationUrl } = await handleEscalationRequest(
    taskId,
    userId,
    originalQuery,
    botAnswer,
    [], // sourceDocumentIds - get from original response
    department,
    reason,
    ipAddress,
    userAgent
  );

  return {
    success: true,
    ticketNumber,
    message: `Your query has been escalated to ${department} team`,
    trackingUrl: escalationUrl,
  };
}
```

### Step 3: Add Feedback Processing

```typescript
// When user rates answer (1-5 stars)
export async function submitAnswerFeedback(
  taskId: string,
  query: string,
  rating: number, // 1-5
  departmentId: number
) {
  await processFeedback(taskId, query, rating, departmentId);

  return {
    success: true,
    message: `Thank you for your feedback!`,
  };
}
```

## RAG Service Integration

### How to Call RAG with Department Scoping

```typescript
import { getAccessibleDocumentsForDepartment } from '@/service/departmentAccessService';

async function callRAGWithScoping(
  query: string,
  department: 'HR' | 'GA' | 'OTHER',
  language: 'en' | 'ja'
) {
  // Get documents accessible to this department
  const accessibleDocs = await getAccessibleDocumentsForDepartment(department);

  // Call RAG with scoping
  const ragResponse = await fetch('http://localhost:8000/search', {
    method: 'POST',
    body: JSON.stringify({
      query: query,
      language: language,
      // NEW: Department scoping
      document_scope: {
        type: 'whitelist',
        document_ids: accessibleDocs,
      },
      // Only return top results
      limit: 5,
    }),
  });

  const results = await ragResponse.json();

  // Validate results are within scope
  const sourceIds = extractDocumentIdsFromRAG(results);
  const allInScope = sourceIds.every(id => accessibleDocs.includes(id));

  if (!allInScope) {
    throw new Error('SECURITY: Cross-department document leak detected!');
  }

  return results;
}
```

## Audit Logging Integration

### Best Practice: Log Everything

```typescript
import { logQueryClassification, logRAGRetrieval, logAnswerGeneration, logFailedOperation } from '@/service/auditService';

async function processQueryWithAudit(
  userId: bigint,
  taskId: string,
  query: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    // 1. Classify and log
    const classification = await classifyQuery(query);
    await logQueryClassification(
      userId,
      taskId,
      query,
      classification.department,
      classification.confidence,
      classification.language,
      classification.detectedKeywords,
      ipAddress,
      userAgent
    );

    // 2. Get documents and log
    const docs = await getAccessibleDocumentsForDepartment(classification.department);
    if (docs.length > 0) {
      await logRAGRetrieval(userId, taskId, 1, docs, ipAddress, userAgent);
    }

    // 3. Generate answer and log
    const answer = await generateAnswer(query);
    await logAnswerGeneration(userId, taskId, 1, classification.language, docs, ipAddress, userAgent);

    return answer;
  } catch (error) {
    // Always log failures
    await logFailedOperation(
      userId,
      'QUERY_PROCESSING',
      'TASK',
      `Failed to process query: ${query.substring(0, 50)}...`,
      error,
      ipAddress,
      userAgent
    );
    throw error;
  }
}
```

## Admin Dashboard Integration

### Show Escalation Dashboard

```typescript
import { getEscalationsForDepartment, getEscalationStats } from '@/service/escalationService';

// API endpoint for admin dashboard
router.get('/admin/escalations', async (ctx) => {
  const departmentId = ctx.query.departmentId || ctx.session.departmentId;
  
  const escalations = await getEscalationsForDepartment(
    departmentId,
    'OPEN', // Only open tickets
    20
  );
  
  const stats = await getEscalationStats();

  ctx.body = {
    escalations,
    stats: {
      totalOpen: stats.total_open,
      averageResolutionTime: stats.average_resolution_time_hours,
      byDepartment: stats.by_department,
    }
  };
});
```

### Show FAQ Analytics

```typescript
import { getFAQAnalyticsDashboard, getTopFAQsByDepartment } from '@/service/faqAnalyticsService';

router.get('/admin/faq-analytics', async (ctx) => {
  const departmentId = ctx.query.departmentId || ctx.session.departmentId;
  
  const dashboard = await getFAQAnalyticsDashboard(departmentId);
  const topFAQs = await getTopFAQsByDepartment(departmentId, 10);

  ctx.body = {
    dashboard,
    recommendations: topFAQs.map(faq => ({
      query: faq.normalized_query,
      frequency: faq.frequency,
      qualityScore: faq.answer_quality_score,
      sourceDocument: faq.source_document_id,
      promote: faq.is_faq_candidate ? 'Remove from FAQ' : 'Promote to FAQ',
    })),
  };
});
```

## Frontend Integration Examples

### React Component: Show Sources

```jsx
function AnswerWithSources({ answer, sources, sourceHtml }) {
  return (
    <div className="answer-container">
      <p className="answer-text">{answer}</p>
      
      {sources && sources.length > 0 && (
        <div className="sources">
          <strong>Sources:</strong>
          <ul>
            {sources.map(source => (
              <li key={source.id}>
                <a 
                  href={`/api/file/preview/${source.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {source.filename}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### React Component: Escalation

```jsx
function AnswerActions({ taskId, originalQuery, answer, department }) {
  const [showEscalation, setShowEscalation] = useState(false);

  const handleEscalate = async () => {
    const response = await fetch('/api/escalation', {
      method: 'POST',
      body: JSON.stringify({
        taskId,
        originalQuery,
        department,
        reason: escalationReason,
      }),
    });
    const { ticketNumber } = await response.json();
    alert(`Escalated with ticket: ${ticketNumber}`);
  };

  return (
    <div className="answer-actions">
      <button onClick={() => submitFeedback(5)}>👍 Helpful</button>
      <button onClick={() => submitFeedback(1)}>👎 Not Helpful</button>
      <button onClick={() => setShowEscalation(true)}>Escalate</button>
      
      {showEscalation && (
        <EscalationDialog
          onEscalate={handleEscalate}
          onCancel={() => setShowEscalation(false)}
        />
      )}
    </div>
  );
}
```

### React Component: FAQ Recommendations

```jsx
function FAQRecommendations({ departmentId, currentQuery }) {
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const response = await fetch(
        `/api/faq-analytics/recommendations?department=${departmentId}&query=${currentQuery}`
      );
      const { data } = await response.json();
      setRecommendations(data);
    }, 300); // Debounce

    return () => clearTimeout(timer);
  }, [currentQuery, departmentId]);

  return (
    <div className="faq-recommendations">
      {recommendations.length > 0 && (
        <>
          <p>Suggested FAQs:</p>
          <ul>
            {recommendations.map((faq, idx) => (
              <li 
                key={idx}
                onClick={() => applyFAQQuery(faq.query)}
                className="faq-suggestion"
              >
                {faq.query} ({faq.frequency}x asked)
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
```

## Permission Checking

### How to Verify Permissions in Routes

```typescript
import { usePermission } from '@/controller/auth';
import PERMISSIONS from '@/utils/permissions';

// Check if user can view escalations
router.get(
  '/escalations',
  usePermission(PERMISSIONS.ESCALATION_VIEW),
  async (ctx) => {
    // Only HR_ADMIN, GA_ADMIN, SUPER_ADMIN reach here
    const escalations = await getEscalationsForDepartment(
      ctx.session.departmentId
    );
    ctx.body = { data: escalations };
  }
);

// Check if user can send messages
router.post(
  '/messages',
  usePermission(PERMISSIONS.ADMIN_MESSAGE_SEND),
  async (ctx) => {
    // Only admins reach here
    await sendAdminMessage(ctx.request.body);
    ctx.body = { success: true };
  }
);
```

## Error Handling Best Practices

```typescript
import { logFailedOperation } from '@/service/auditService';

async function safeQueryProcessing(
  userId: bigint,
  query: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    // Normal processing
    const result = await processChatTask({
      taskId: nanoid(),
      userId,
      query,
      ipAddress,
      userAgent,
    });
    
    return { success: true, data: result };
  } catch (error) {
    // Log the error for audit trail
    await logFailedOperation(
      userId,
      'QUERY_PROCESSING',
      'TASK',
      `Failed to process query`,
      error,
      ipAddress,
      userAgent
    );

    // Return safe error to user
    if (error.message.includes('Cross-department')) {
      return {
        success: false,
        error: 'Security error detected',
        statusCode: 403,
      };
    }

    return {
      success: false,
      error: 'Failed to process query. Please try again.',
      statusCode: 500,
    };
  }
}
```

## Testing Examples

### Unit Test: Classification

```typescript
import { classifyQuery } from '@/service/triageAgentService';

describe('Query Classification', () => {
  it('should classify HR queries correctly', async () => {
    const result = await classifyQuery('What is the leave policy?');
    expect(result.department).toBe('HR');
    expect(result.confidence).toBeGreaterThan(50);
  });

  it('should classify GA queries correctly', async () => {
    const result = await classifyQuery('Where is the office?');
    expect(result.department).toBe('GA');
    expect(result.confidence).toBeGreaterThan(50);
  });

  it('should detect language correctly', async () => {
    const en = await classifyQuery('What is my salary?');
    expect(en.language).toBe('en');

    const ja = await classifyQuery('給料はいくらですか？');
    expect(ja.language).toBe('ja');
  });
});
```

### Integration Test: Department Isolation

```typescript
describe('Department Isolation', () => {
  it('should not leak HR documents to GA queries', async () => {
    const gaQuery = 'Where is the meeting room?';
    const gaClassification = await classifyQuery(gaQuery);
    
    const accessibleDocs = await getAccessibleDocumentsForDepartment(
      gaClassification.department
    );
    
    // Should not include any HR documents
    expect(accessibleDocs.every(id => !isHRDocument(id))).toBe(true);
  });
});
```

## Monitoring & Observability

### Key Metrics to Track

```typescript
// In your monitoring service:
const metrics = {
  // Classification accuracy
  classificationAccuracy: 0.92, // 92% confident
  
  // Cross-department attempts (should be 0)
  crossDepartmentAttempts: 0,
  
  // Escalation rate
  escalationRate: 0.05, // 5% of queries
  
  // Answer quality
  averageQualityScore: 78.5,
  
  // FAQ effectiveness
  faqCandidates: 142,
  faqUtilization: 0.25, // 25% of queries are FAQs
};
```

## Summary

The integration is designed to be:
- **Non-breaking**: Works alongside existing code
- **Incremental**: Can be implemented step-by-step
- **Auditable**: Every action logged
- **Secure**: Department isolation enforced
- **Observable**: Comprehensive metrics available

