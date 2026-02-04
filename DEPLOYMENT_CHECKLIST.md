# Enterprise QA Bot - Deployment Checklist

## Pre-Deployment

- [ ] Review all code changes for security
- [ ] Verify database models compile
- [ ] Test all new services in isolation
- [ ] Validate permission mappings
- [ ] Review audit logging format
- [ ] Check RAG service compatibility

## Database Migration

```sql
-- 1. Create new tables (from models)
-- These will be created by Sequelize synchronization
-- Or manually run migrations from generated SQL

-- 2. Initialize departments
INSERT INTO department (code, name, is_active) VALUES
('HR', 'Human Resources', true),
('GA', 'General Affairs', true),
('OTHER', 'General Queries', true);

-- 3. Add admin roles (ensure these exist)
-- HR_ADMIN -> assign HR department admin group
-- GA_ADMIN -> assign GA department admin group

-- 4. Create indexes for audit log
CREATE INDEX idx_audit_user ON audit_log(user_id, created_at);
CREATE INDEX idx_audit_dept ON audit_log(department_id, created_at);
CREATE INDEX idx_audit_action ON audit_log(action_type, created_at);
```

## Service Deployment Order

### 1. Core Models & Database (Priority: CRITICAL)
- [ ] Deploy database models
- [ ] Run migrations
- [ ] Initialize departments
- [ ] Verify schema

### 2. Triage & Access Control (Priority: CRITICAL)
- [ ] Deploy `triageAgentService.ts`
- [ ] Deploy `departmentAccessService.ts`
- [ ] Test classification accuracy
- [ ] Verify document scoping

### 3. Audit & Security (Priority: CRITICAL)
- [ ] Deploy `auditService.ts`
- [ ] Verify audit logging works
- [ ] Test compliance audit trails
- [ ] Check disk space for logs

### 4. RAG Integration (Priority: HIGH)
- [ ] Update RAG calls with department scoping
- [ ] Test RAG with filters
- [ ] Verify source extraction
- [ ] Deploy `sourceAttributionService.ts`

### 5. Escalation Pipeline (Priority: HIGH)
- [ ] Deploy `escalationService.ts`
- [ ] Deploy escalation routes
- [ ] Create escalation dashboard
- [ ] Test ticket workflow

### 6. Messaging & Admin (Priority: MEDIUM)
- [ ] Deploy `adminMessagingService.ts`
- [ ] Deploy messaging routes
- [ ] Create message UI components
- [ ] Test @mention system

### 7. Analytics (Priority: MEDIUM)
- [ ] Deploy `faqAnalyticsService.ts`
- [ ] Deploy analytics routes
- [ ] Create analytics dashboard
- [ ] Test recommendation engine

### 8. Integration (Priority: HIGH)
- [ ] Update `chatTask` service
- [ ] Update `genTaskService` 
- [ ] Deploy `enhancedChatTaskService.ts`
- [ ] Integration testing

## Configuration

### Environment Variables
```bash
# .env or config files
NODE_ENV=production
LOG_LEVEL=info

# Database
DB_HOST=localhost
DB_USER=root
DB_PASS=password
DB_NAME=expo_db

# RAG Service
RAG_SERVICE_URL=http://localhost:8000
RAG_SERVICE_TIMEOUT=30000

# LLM Service
LLM_SERVICE_URL=http://localhost:8001
LLM_MODEL=gpt-oss:20b
LLM_TIMEOUT=60000

# Security
AUDIT_LOG_RETENTION_DAYS=365
MESSAGE_RETENTION_DAYS=90
ESCALATION_SLA_HOURS=24
```

### Permission Setup
Add new permissions to your RBAC system:
```
ESCALATION_VIEW
ESCALATION_MANAGE
ADMIN_MESSAGE_VIEW
ADMIN_MESSAGE_SEND
FAQ_VIEW
FAQ_MANAGE
DEPARTMENT_VIEW
DEPARTMENT_MANAGE
AUDIT_VIEW
```

### Assign to Roles
```
HR_ADMIN role:
  - ESCALATION_VIEW, ESCALATION_MANAGE (HR department)
  - ADMIN_MESSAGE_SEND
  - FAQ_VIEW, FAQ_MANAGE
  - AUDIT_VIEW

GA_ADMIN role:
  - ESCALATION_VIEW, ESCALATION_MANAGE (GA department)
  - ADMIN_MESSAGE_SEND
  - FAQ_VIEW, FAQ_MANAGE
  - AUDIT_VIEW

SUPER_ADMIN role:
  - All of the above
  - DEPARTMENT_MANAGE
```

## Testing Checklist

### Unit Tests
- [ ] Triage classification accuracy (>90%)
- [ ] Document access control (no leakage)
- [ ] Source extraction from RAG
- [ ] Escalation ticket creation
- [ ] Audit logging functionality
- [ ] Message storage & retrieval
- [ ] FAQ analytics tracking

### Integration Tests
- [ ] End-to-end query flow
- [ ] Department isolation (HR ↔ GA)
- [ ] RAG scoping verification
- [ ] Escalation routing
- [ ] Admin messaging
- [ ] Analytics accuracy

### Security Tests
- [ ] Cross-department query attempt (should fail)
- [ ] Unauthorized escalation access (should deny)
- [ ] Audit log completeness (all actions logged)
- [ ] Source document validation
- [ ] Permission enforcement

### Performance Tests
- [ ] Classification latency (<100ms)
- [ ] RAG scoping overhead (<50ms)
- [ ] Audit logging throughput (>1000 logs/sec)
- [ ] Message retrieval latency (<200ms)

### Compliance Tests
- [ ] All user actions audited
- [ ] Department boundaries enforced
- [ ] Source attribution complete
- [ ] Escalation tracking accurate
- [ ] Message retention enforced

## Rollback Plan

If issues detected:

### Critical Issues (Rollback Immediately)
- Cross-department document leak
- Audit logging failure
- Department scoping broken
- Security breach detected

**Rollback Steps:**
```bash
# 1. Stop new services
docker-compose stop api

# 2. Revert to previous code
git checkout HEAD~1

# 3. Clear any corrupted data
# (depends on the issue)

# 4. Restart with old code
docker-compose up -d api

# 5. Investigate root cause
# 6. Fix in new branch
# 7. Re-test thoroughly
```

### Non-Critical Issues (Staged Rollback)
- Escalation issues: Disable escalation temporarily
- Messaging issues: Disable messaging temporarily
- Analytics issues: Disable recommendations temporarily

**Staged Rollback:**
```typescript
// In feature flags
if (!FEATURE_FLAGS.ESCALATION_ENABLED) {
  // Skip escalation
}
```

## Post-Deployment Verification

### Day 1
- [ ] Monitor API error logs
- [ ] Check audit log growth
- [ ] Verify escalation tickets work
- [ ] Test messaging system
- [ ] Check database connectivity

### Week 1
- [ ] Review audit log samples
- [ ] Verify department isolation
- [ ] Check analytics accuracy
- [ ] Monitor classification accuracy
- [ ] Validate source attribution

### Month 1
- [ ] Generate compliance report
- [ ] Review FAQ recommendations
- [ ] Check escalation resolution rate
- [ ] Validate cross-department protection
- [ ] Performance analysis

## Support & Troubleshooting

### Common Issues

**Issue: Cross-department documents appearing**
```
Cause: Department scoping not applied in RAG
Fix: Verify RAG call includes department_scope filter
     Check accessibleDocumentIds calculation
```

**Issue: Escalations not routing to admins**
```
Cause: Admin group not assigned to department
Fix: Verify department.admin_group_id is set
     Check user_group table membership
```

**Issue: Audit logs not being written**
```
Cause: Database permissions or connection issue
Fix: Check DB user has INSERT on audit_log table
     Verify connection pool settings
```

**Issue: Source documents not appearing**
```
Cause: RAG response format not matching extraction
Fix: Review extractDocumentIdsFromRAG() function
     Update field name mapping if needed
```

## Monitoring Commands

```bash
# Check audit log growth
SELECT DATE(created_at), COUNT(*) FROM audit_log 
GROUP BY DATE(created_at) 
ORDER BY DATE(created_at) DESC LIMIT 10;

# Check escalation stats
SELECT status, COUNT(*) FROM escalation 
GROUP BY status;

# Check department document counts
SELECT d.code, COUNT(fd.id) FROM department d
LEFT JOIN file_department fd ON d.id = fd.department_id
GROUP BY d.id, d.code;

# Check FAQ candidates
SELECT department_id, COUNT(*) FROM faq_analytics 
WHERE is_faq_candidate = true 
GROUP BY department_id;
```

## Documentation Updates

- [ ] Update API documentation
- [ ] Update admin guide
- [ ] Update user guide
- [ ] Update security policy
- [ ] Update compliance documentation
- [ ] Create runbooks for operations team

