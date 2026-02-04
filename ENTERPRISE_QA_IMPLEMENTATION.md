
# ExpoBot Enterprise QA System - Implementation Guide

## Overview

This document describes the comprehensive implementation of the enterprise QA bot system with department classification, RAG scoping, escalation, and security governance.

## 🏗️ Architecture

### Core Components

1. **Triage Agent** (`triageAgentService.ts`)
   - Language detection (EN/JA)
   - Department classification (HR/GA/Other)
   - Keyword-based routing
   - Confidence scoring

2. **Department Access Control** (`departmentAccessService.ts`)
   - Document filtering by department
   - Cross-department leakage prevention
   - Safe fallback responses
   - Access validation

3. **Source Attribution** (`sourceAttributionService.ts`)
   - Document metadata linking
   - Clickable source links
   - Document access logging
   - Source validation

4. **Escalation Pipeline** (`escalationService.ts`)
   - Automatic ticket generation
   - Department routing
   - Admin assignment
   - Resolution tracking

5. **Admin Messaging** (`adminMessagingService.ts`)
   - Broadcast & direct messages
   - @mention support
   - Message pinning
   - Read status tracking

6. **FAQ Analytics** (`faqAnalyticsService.ts`)
   - Query frequency tracking
   - FAQ candidate identification
   - Quality score tracking
   - Recommendation engine

7. **Audit Logging** (`auditService.ts`)
   - Comprehensive action tracking
   - Security compliance
   - Department isolation verification
   - Query history preservation

## 🔄 Query Processing Flow

```
User Query
    ↓
[1] Language Detection & Classification
    - Detect: EN or JA
    - Classify: HR, GA, or OTHER
    - Log classification
    ↓
[2] Department-Scoped Access Control
    - Get accessible documents for department
    - Apply document filter
    ↓
[3] RAG Retrieval
    - Search ONLY department documents
    - Extract source document IDs
    - Validate scoping
    ↓
[4] Answer Generation
    - Generate answer (with LLM)
    - Return fallback if no documents
    ↓
[5] Source Attribution
    - Attach document metadata
    - Create clickable links
    - Log document access
    ↓
[6] FAQ Analytics
    - Track query frequency
    - Update quality scores
    - Suggest FAQ candidates
    ↓
[7] Return to User
    - Answer in detected language
    - With source attribution
    - With FAQ recommendations
    - With escalation option
```

## 📊 Database Schema

### New Tables

#### `department`
- Defines HR, GA, Other departments
- Links to admin groups
- Tracks active status

#### `file_department`
- Maps documents to departments
- Enforces document scoping
- Marks primary departments

#### `query_classification`
- Audit trail for classifications
- Tracks language detection
- Stores confidence scores

#### `audit_log`
- Comprehensive action logging
- User-based filtering
- Department tracking
- Security compliance

#### `escalation`
- Escalation tickets
- Status tracking
- Admin assignment
- Resolution notes

#### `admin_message`
- Broadcast messages
- Direct messaging
- @mention support
- Read status

#### `faq_analytics`
- Query frequency
- Quality scoring
- FAQ candidates
- Trend tracking

## 🔐 Security & Governance

### Department Isolation (CRITICAL)

**Enforcement Points:**
1. Classification happens BEFORE RAG
2. RAG receives `department_scope` filter
3. Results validated against accessible documents
4. All document access audited
5. Cross-department queries rejected

**Validation:**
```typescript
// Every RAG response is validated
const filtered = ragResults.filter(r => 
  accessibleDocumentIds.includes(r.document_id)
);
```

### Audit Trail

**All actions logged:**
- Query classifications
- RAG retrievals
- Answer generation
- Document access
- Escalations
- Admin messages
- File uploads/downloads

**Audit fields:**
- user_id
- action_type
- resource_type
- department_id
- ip_address
- user_agent
- timestamp

### RBAC Integration

**New Permissions:**
```typescript
ESCALATION_VIEW      // View escalations
ESCALATION_MANAGE    // Assign/resolve escalations
ADMIN_MESSAGE_VIEW   // View admin messages
ADMIN_MESSAGE_SEND   // Send admin messages
FAQ_VIEW             // View FAQ analytics
FAQ_MANAGE           // Manage FAQs
DEPARTMENT_VIEW      // View department settings
DEPARTMENT_MANAGE    // Manage departments
AUDIT_VIEW           // View audit logs
```

## 🔌 Integration Points

### With Existing `chatTask` Service

The enhanced chat processor orchestrates:

1. **Before RAG:**
   - Language detection
   - Query classification
   - Department lookup
   - Document access control

2. **RAG Call:**
   ```typescript
   // Existing RAG call with new parameters
   const ragResults = await ragService.search({
     query,
     language: classification.language,
     department: classification.department,
     document_ids: accessibleDocumentIds  // NEW: Scoping
   });
   ```

3. **After RAG:**
   - Source validation
   - Attribution generation
   - FAQ analytics
   - Audit logging

### With Existing `genTaskService`

New task types can be added:
```typescript
case 'ESCALATION':
  await handleEscalation(formData);
  break;
case 'FEEDBACK':
  await processFeedback(formData);
  break;
```

## 🚀 Implementation Steps

### Phase 1: Database Setup
1. Create new models in `mysql/model/`
2. Create migrations (Sequelize)
3. Initialize departments with HR, GA, Other
4. Map existing documents to departments

### Phase 2: Core Services
1. Deploy triage service
2. Deploy department access service
3. Deploy source attribution
4. Deploy audit service

### Phase 3: Escalation & Messaging
1. Deploy escalation service
2. Deploy admin messaging
3. Create admin routes
4. Create escalation routes

### Phase 4: Analytics
1. Deploy FAQ analytics
2. Create analytics routes
3. Setup recommendation engine
4. Create admin dashboard

### Phase 5: Integration
1. Integrate with existing chat flow
2. Update RAG calls with scoping
3. Add middleware for audit logging
4. Update UI for new features

### Phase 6: Testing & Deployment
1. Unit tests for each service
2. Integration tests for flow
3. Security testing (document leakage)
4. Production deployment

## 📝 Configuration

### Environment Variables
```bash
# Department admin groups
HR_ADMIN_GROUP_ID=1
GA_ADMIN_GROUP_ID=2

# RAG service
RAG_SERVICE_URL=http://localhost:8000
RAG_SERVICE_TIMEOUT=30000

# LLM service
LLM_SERVICE_URL=http://localhost:8001
LLM_MODEL=gpt-oss:20b

# Escalation
ESCALATION_AUTO_ASSIGN=true
ESCALATION_SLA_HOURS=24

# Message expiration
MESSAGE_RETENTION_DAYS=90
```

### Department Setup
```sql
INSERT INTO department (code, name, admin_group_id) VALUES
('HR', 'Human Resources', 1),
('GA', 'General Affairs', 2),
('OTHER', 'General Queries', NULL);
```

## 🧪 Testing Examples

### Test Scenario 1: HR Query Triage
```typescript
const result = await classifyQuery(
  "What is the leave policy for maternity?"
);
// Expected: HR, confidence > 50
```

### Test Scenario 2: Document Scoping
```typescript
const docs = await getAccessibleDocumentsForDepartment('HR');
// Should only return HR documents
```

### Test Scenario 3: Escalation
```typescript
const escalation = await createEscalationTicket({
  user_id: 123n,
  query: "Can I claim home office expenses?",
  answer: "No relevant documents found",
  department: 'GA'
});
// Ticket routed to GA admin
```

### Test Scenario 4: Audit Trail
```typescript
const logs = await AuditLog.findAll({
  where: { user_id: 123n, department_id: 1 }
});
// Shows all user's queries in HR department
```

## ⚠️ Critical Security Notes

### Never Bypass Department Scoping
❌ WRONG:
```typescript
const ragResults = await rag.search(query);  // No scoping!
```

✅ RIGHT:
```typescript
const docs = await getAccessibleDocumentsForDepartment(department);
const ragResults = await rag.search(query, { document_ids: docs });
```

### Always Validate Sources
❌ WRONG:
```typescript
const answer = ragResults.map(r => r.content).join('');
// Sources not validated!
```

✅ RIGHT:
```typescript
const sourceIds = extractDocumentIdsFromRAG(ragResults);
const validated = await validateSources(sourceIds, accessibleDocs);
if (!validated) throw new Error('Cross-department leak detected');
```

### Log All Actions
❌ WRONG:
```typescript
const answer = generateAnswer(query);
return answer;  // No audit trail
```

✅ RIGHT:
```typescript
const answer = generateAnswer(query);
await logAnswerGeneration(userId, taskId, departmentId, ...);
return answer;
```

## 🔍 Monitoring & Observability

### Key Metrics
- Query classification accuracy
- RAG relevance rate
- Escalation rate
- Resolution time
- Cross-department leak attempts
- Document access patterns

### Alert Conditions
1. Multiple cross-department access attempts
2. Escalation spike (>20 per day)
3. Low answer quality (<40%)
4. FAQ analytics anomalies
5. Audit log write failures

## 📚 References

- [Triage Service](./triageAgentService.ts)
- [Department Access](./departmentAccessService.ts)
- [Source Attribution](./sourceAttributionService.ts)
- [Escalation Pipeline](./escalationService.ts)
- [Admin Messaging](./adminMessagingService.ts)
- [FAQ Analytics](./faqAnalyticsService.ts)
- [Audit Logging](./auditService.ts)
- [Enhanced Chat Task](./enhancedChatTaskService.ts)

