# Enterprise QA Bot - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE (UI)                      │
│  - Chat Input                                                    │
│  - Escalation Button                                             │
│  - Feedback Rating                                               │
│  - FAQ Suggestions                                               │
│  - Source Attribution Display                                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API ORCHESTRATION LAYER                       │
│                  (enhancedChatTaskService)                       │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Language   │  │ Department   │  │  Document    │           │
│  │  Detection   │  │ Classification│  │  Access      │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└────────┬──────────┬──────────────┬──────────────────┬────────────┘
         │          │              │                  │
         ▼          ▼              ▼                  ▼
    ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────────┐
    │ Triage  │ │Department│ │   RAG    │ │ Source           │
    │ Agent   │ │ Access   │ │ Retrieval│ │ Attribution      │
    │ Service │ │ Service  │ │ (Scoped) │ │ Service          │
    └─────────┘ └─────────┘ └──────────┘ └──────────────────┘
         │          │              │                  │
         └──────────┼──────────────┼──────────────────┘
                    │              │
                    ▼              ▼
            ┌─────────────────────────────┐
            │    Audit Log Service        │
            │  - Log all classifications  │
            │  - Log all accesses         │
            │  - Log all answers          │
            └─────────────────────────────┘
                    │
                    ▼
        ┌──────────────────────────────────┐
        │     FAQ Analytics Service        │
        │  - Track query frequency         │
        │  - Quality scoring               │
        │  - Recommendation engine         │
        └──────────────────────────────────┘
```

## Query Processing Pipeline

```
QUERY RECEIVED
    │
    ▼
┌─────────────────────────┐
│ STEP 1: LANGUAGE        │
│ DETECTION               │
│                         │
│ Input: User query       │
│ Output: EN or JA        │
│ Time: <100ms            │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ STEP 2: CLASSIFICATION  │
│ (TRIAGE)                │
│                         │
│ Input: Query + Language │
│ Output: HR/GA/OTHER     │
│ Output: Confidence      │
│ Time: <50ms             │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ STEP 3: DOCUMENT        │
│ ACCESS CONTROL          │
│                         │
│ Input: Department       │
│ Output: Accessible Docs │
│ Time: <50ms             │
└────────────┬────────────┘
             │
             ▼
        ┌─────────────────────────┐
        │ STEP 4: RAG RETRIEVAL   │
        │ (WITH DEPARTMENT SCOPE) │
        │                         │
        │ Input: Query            │
        │ Filter: Accessible docs │
        │ Output: Ranked results  │
        │ Time: 1-3 sec           │
        └────────────┬────────────┘
                     │
                     ▼
        ┌─────────────────────────┐
        │ STEP 5: ANSWER          │
        │ GENERATION (LLM)        │
        │                         │
        │ Input: Query + Context  │
        │ Language: Detected      │
        │ Output: Answer text     │
        │ Time: 3-5 sec           │
        └────────────┬────────────┘
                     │
                     ▼
        ┌─────────────────────────┐
        │ STEP 6: SOURCE          │
        │ ATTRIBUTION             │
        │                         │
        │ Input: Answer + Docs    │
        │ Output: Metadata links  │
        │ Output: HTML with links │
        │ Time: <100ms            │
        └────────────┬────────────┘
                     │
                     ▼
        ┌─────────────────────────┐
        │ STEP 7: FAQ ANALYTICS   │
        │ TRACKING                │
        │                         │
        │ Input: Query + Metadata │
        │ Action: Update frequency│
        │ Action: Score quality   │
        │ Time: <50ms             │
        └────────────┬────────────┘
                     │
                     ▼
        ┌─────────────────────────┐
        │ STEP 8: RETURN RESPONSE │
        │                         │
        │ - Answer text           │
        │ - Source attribution    │
        │ - FAQ suggestions       │
        │ - Escalation option     │
        │ - Language detected     │
        └────────────┬────────────┘
                     │
                     ▼
                USER GETS
              ANSWER WITH
            SOURCES & OPTIONS
```

## Department Isolation Architecture

```
┌────────────────────────────────────────────────────────┐
│                 QUERY RECEIVED                         │
│              "leave policy?"                           │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼
        ┌──────────────────────────────┐
        │ CLASSIFY DEPARTMENT          │
        │ Keywords: leave, policy      │
        │ Result: HR                   │
        └───────────┬──────────────────┘
                    │
        ┌───────────┴────────────────────────┐
        │ GET ACCESSIBLE DOCS (HR DEPT)      │
        │ [Doc1: HR_Policy.pdf]              │
        │ [Doc2: LeavePolicy.doc]            │
        │ [Doc3: BenefitGuide.pdf]           │
        │ [Doc4: SalaryStructure.xlsx]       │
        │ (NO GA documents allowed!)         │
        └───────────┬──────────────────────┘
                    │
        ┌───────────┴────────────────────────┐
        │ CALL RAG WITH DEPARTMENT FILTER    │
        │ Query: "leave policy?"             │
        │ DocIds: [1,2,3,4]                  │
        │ NoAccess: [5,6,7...] (GA docs)     │
        └───────────┬──────────────────────┘
                    │
        ┌───────────┴──────────────────────────┐
        │ RAG RETURNS SCOPED RESULTS           │
        │ Result1: Doc1 (HR_Policy.pdf)        │
        │ Result2: Doc2 (LeavePolicy.doc)      │
        │                                     │
        │ (NEVER Returns GA docs)              │
        └───────────┬──────────────────────────┘
                    │
        ┌───────────┴────────────────────────┐
        │ VALIDATE RESULTS ARE IN SCOPE      │
        │ Check: All results in [1,2,3,4]    │
        │ Status: ✓ VALID                    │
        └───────────┬──────────────────────┘
                    │
        ┌───────────┴────────────────────────┐
        │ ATTACH SOURCE ATTRIBUTION          │
        │ [SOURCE: LeavePolicy.doc]          │
        │ (Clickable link with metadata)     │
        └───────────┬──────────────────────┘
                    │
                    ▼
            ✓ SAFE TO RETURN
                ANSWER
```

## Database Relationships

```
┌──────────────────┐
│   department     │
├──────────────────┤
│ id (PK)          │
│ code (HR/GA)     │
│ name             │
│ admin_group_id   │
└────────┬─────────┘
         │
         │ 1:N
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│ file_department  │◄────►   file          │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │
│ file_id (FK)     │     │ filename         │
│ department_id(FK)│     │ storage_key      │
│ is_primary       │     │ mime_type        │
└──────────────────┘     └──────────────────┘

┌──────────────────────┐
│   user               │
├──────────────────────┤
│ user_id (PK)         │
│ user_name            │
│ email                │
│ department           │
└────────┬─────────────┘
         │
         │ 1:N
         ├───────────────────┬────────────────┬──────────┐
         │                   │                │          │
         ▼                   ▼                ▼          ▼
┌────────────────────┐ ┌──────────────────┐ ┌──────┐ ┌───────────┐
│query_classification│ │escalation        │ │audit_│ │admin_     │
├────────────────────┤ ├──────────────────┤ │log   │ │message    │
│id (PK)             │ │id (PK)           │ │      │ │           │
│query_id            │ │ticket_number     │ │      │ │sender or  │
│user_id (FK)        │ │user_id (FK)      │ │      │ │recipient  │
│classified_dept(FK) │ │department_id(FK) │ │      │ │           │
│orig_query          │ │status            │ │      │ │           │
│language            │ │resolved_at       │ │      │ │           │
└────────────────────┘ └──────────────────┘ └──────┘ └───────────┘

┌──────────────────┐
│ faq_analytics    │
├──────────────────┤
│ id (PK)          │
│ department_id(FK)│
│ query_hash       │
│ frequency        │
│ quality_score    │
│ is_faq_candidate │
└──────────────────┘
```

## Service Dependency Graph

```
┌───────────────────────────┐
│ enhancedChatTaskService   │ (Orchestrator)
└───────────────┬───────────┘
                │
    ┌───────────┼───────────────────────────────────┐
    │           │                                   │
    ▼           ▼                                   ▼
┌─────────┐ ┌──────────────┐              ┌──────────────────┐
│ Triage  │ │Department    │              │Source            │
│Agent    │ │Access        │              │Attribution       │
└────┬────┘ └──────┬───────┘              └────────┬─────────┘
     │             │                               │
     │             │  ┌────────────────────┐      │
     └─────────────┼──► auditService       │◄─────┘
                   │  └────────────────────┘
                   │
                   └──────────────────────────┐
                                              │
        ┌─────────────────────────────────────┤
        │           ┌──────────────────┐      │
        └──────────►│faqAnalyticsService│     │
                   └──────────────────┘      │
                                             │
        ┌────────────────────────────────────┘
        │
        ├────────────────────────────────┐
        │   Other Services (on demand):   │
        │   - escalationService           │
        │   - adminMessagingService       │
        │                                 │
        └────────────────────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────────┐
│            REQUEST AUTHENTICATION                        │
│  (Existing RBAC system)                                 │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│        REQUEST AUTHORIZATION (Permissions)              │
│  - Check user permissions                               │
│  - Verify RBAC roles                                    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│          QUERY CLASSIFICATION & SCOPING                 │
│  - Detect language                                      │
│  - Classify department                                  │
│  - Get accessible documents (WHITELIST)                │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│           RAG RETRIEVAL WITH SCOPING                    │
│  - Apply document ID filter                             │
│  - Search only allowed documents                        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│         RESULT VALIDATION & ATTRIBUTION                 │
│  - Validate all results in scope                        │
│  - Extract source metadata (not guessed)                │
│  - Log document access                                  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│          AUDIT LOGGING & COMPLIANCE                     │
│  - Log user query                                       │
│  - Log classification                                   │
│  - Log answer generation                                │
│  - Log escalations                                      │
│  - Log document access                                  │
└─────────────────────────────────────────────────────────┘
```

## Admin Dashboard Architecture

```
┌─────────────────────────────────────────────────┐
│          ADMIN DASHBOARD                        │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ Escalations  │  │   Messages   │            │
│  │  Widget      │  │   Widget     │            │
│  ├──────────────┤  ├──────────────┤            │
│  │ - Open: 12   │  │ - Unread: 5  │            │
│  │ - In Prog: 3 │  │ - Pinned: 2  │            │
│  │ - Resolved:42│  │ - Sent: 120  │            │
│  └──────────────┘  └──────────────┘            │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐            │
│  │   FAQ        │  │   Audit      │            │
│  │  Analytics   │  │    Trail     │            │
│  ├──────────────┤  ├──────────────┤            │
│  │ - Tracked:3k │  │ - Queries:5k │            │
│  │ - Candidates:│  │ - Accesses: │            │
│  │   142        │  │   8k        │            │
│  │ - Avg Score: │  │ - Escalations│            │
│  │   78.5       │  │   : 120     │            │
│  └──────────────┘  └──────────────┘            │
│                                                 │
└─────────────────────────────────────────────────┘
        │       │         │         │
        ▼       ▼         ▼         ▼
    ┌────────────────────────────────┐
    │      BACKEND SERVICES          │
    │                                │
    │ escalationService              │
    │ adminMessagingService          │
    │ faqAnalyticsService            │
    │ auditService                   │
    └────────────────────────────────┘
        │       │         │         │
        └───────┴─────────┴─────────┘
                │
                ▼
        ┌──────────────────┐
        │   MySQL Database │
        │                  │
        │ - escalation     │
        │ - admin_message  │
        │ - faq_analytics  │
        │ - audit_log      │
        └──────────────────┘
```

---

## Key Design Patterns

### 1. Defense in Depth
```
REQUEST
  ↓ Authenticate
  ↓ Authorize (RBAC)
  ↓ Classify & Scope
  ↓ Execute with filters
  ↓ Validate results
  ↓ Audit all actions
SAFE RESPONSE
```

### 2. Separation of Concerns
```
Classification (triage) → separate service
Access Control → separate service
Attribution → separate service
Audit Logging → separate service
Analytics → separate service
```

### 3. Whitelist Approach
```
✅ Whitelist: "Only these documents"
❌ Blacklist: "Not these documents"

Why: Safer, default-deny principle
```

### 4. Metadata Validation
```
RAG returns: documents
✓ Validate: all in accessible list
✓ Log: access for each document
✓ Attach: metadata (don't guess)
```

---

## Conclusion

This architecture provides:
- **Zero cross-department leakage** (by design)
- **Complete audit trail** (for compliance)
- **Smart routing** (to right people)
- **Scalable design** (database-backed)
- **Security first** (multiple layers)

