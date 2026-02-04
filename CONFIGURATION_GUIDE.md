# Enterprise QA Bot - Configuration Guide

## Overview

This guide covers all configuration options for the Enterprise QA Bot system.

---

## Part 1: Environment Variables

### Core Configuration

```bash
# .env.example

# ============================================
# DATABASE CONFIGURATION
# ============================================

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=expoproj

# ============================================
# REDIS CONFIGURATION (Existing)
# ============================================

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# ============================================
# RAG SERVICE CONFIGURATION
# ============================================

# URL to Python RAG microservice
RAG_SERVICE_URL=http://localhost:8000

# RAG service timeout (milliseconds)
RAG_TIMEOUT=30000

# Enable department scoping in RAG requests
RAG_DEPARTMENT_SCOPING=true

# ============================================
# LANGUAGE & TRANSLATION
# ============================================

# Supported languages
SUPPORTED_LANGUAGES=EN,JA

# Default language
DEFAULT_LANGUAGE=EN

# Translation API configuration (optional)
# Leave empty if using client-side translation
TRANSLATION_API_URL=
TRANSLATION_API_KEY=

# ============================================
# TRIAGE AGENT CONFIGURATION
# ============================================

# Minimum confidence threshold for classification (0-100)
TRIAGE_MIN_CONFIDENCE=40

# Enable strict mode (fail if confidence too low)
TRIAGE_STRICT_MODE=false

# Triage keywords path (relative to api/src/config/)
TRIAGE_KEYWORDS_FILE=triage_keywords.json

# ============================================
# AUDIT LOGGING CONFIGURATION
# ============================================

# Enable audit logging
AUDIT_ENABLED=true

# Audit log retention (days)
AUDIT_RETENTION_DAYS=365

# Log all queries (may affect performance)
AUDIT_LOG_ALL_QUERIES=true

# ============================================
# ESCALATION CONFIGURATION
# ============================================

# Enable escalation feature
ESCALATION_ENABLED=true

# Escalation SLA (hours before warning)
ESCALATION_SLA_HOURS=24

# Maximum escalations per user per day
MAX_ESCALATIONS_PER_USER=5

# ============================================
# FAQ ANALYTICS CONFIGURATION
# ============================================

# Enable FAQ analytics
FAQ_ANALYTICS_ENABLED=true

# Minimum query frequency to consider as FAQ candidate
FAQ_MIN_FREQUENCY=3

# Analytics cleanup interval (hours)
FAQ_CLEANUP_INTERVAL=24

# ============================================
# ADMIN MESSAGING CONFIGURATION
# ============================================

# Enable admin messaging
ADMIN_MESSAGING_ENABLED=true

# Message retention (days)
MESSAGE_RETENTION_DAYS=90

# ============================================
# SECURITY & AUTHENTICATION
# ============================================

# JWT token expiration
JWT_EXPIRATION=24h

# Enable RBAC (existing system)
RBAC_ENABLED=true

# API rate limiting (requests per minute)
API_RATE_LIMIT=100

# ============================================
# LOGGING & MONITORING
# ============================================

# Log level (debug, info, warn, error)
LOG_LEVEL=info

# Enable request logging
LOG_REQUESTS=true

# Enable performance metrics
METRICS_ENABLED=true

# ============================================
# API SERVER CONFIGURATION
# ============================================

# API server port
API_PORT=3000

# API server host
API_HOST=0.0.0.0

# Enable CORS
CORS_ENABLED=true

# CORS origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# ============================================
# DOCUMENT STORAGE
# ============================================

# Document storage path
DOCUMENT_STORAGE_PATH=/mnt/data/documents

# Maximum file upload size (MB)
MAX_UPLOAD_SIZE=100

# Allowed file types
ALLOWED_FILE_TYPES=pdf,doc,docx,txt,xlsx

# ============================================
# FEATURE FLAGS
# ============================================

# Enable language detection
FEATURE_LANGUAGE_DETECTION=true

# Enable department scoping
FEATURE_DEPARTMENT_SCOPING=true

# Enable source attribution
FEATURE_SOURCE_ATTRIBUTION=true

# Enable escalation
FEATURE_ESCALATION=true

# Enable FAQ analytics
FEATURE_FAQ_ANALYTICS=true

# Enable admin messaging
FEATURE_ADMIN_MESSAGING=true

# ============================================
# DEVELOPMENT & TESTING
# ============================================

# Environment (development, staging, production)
NODE_ENV=development

# Enable debug mode
DEBUG=false

# Mock RAG service (for testing)
MOCK_RAG=false
```

---

## Part 2: Configuration Files

### 2.1 Triage Keywords Configuration

```json
{
  "config": {
    "version": "1.0",
    "last_updated": "2024-01-01",
    "total_keywords": 150
  },
  "HR": {
    "name": "Human Resources",
    "color": "#FF6B6B",
    "keywords": [
      "leave",
      "vacation",
      "paid time off",
      "pto",
      "sick leave",
      "holiday",
      "benefit",
      "health insurance",
      "pension",
      "401k",
      "salary",
      "payroll",
      "bonus",
      "raise",
      "promotion",
      "contract",
      "employment",
      "hire",
      "fire",
      "resign",
      "retirement",
      "onboarding",
      "orientation",
      "training",
      "maternity",
      "paternity",
      "parental leave",
      "grievance",
      "harassment",
      "discrimination",
      "equal opportunity",
      "diversity",
      "inclusion",
      "code of conduct",
      "policy",
      "compliance",
      "handbook",
      "employee assistance",
      "eap",
      "counseling",
      "wellness",
      "gym",
      "fitness",
      "mental health",
      "work-life balance",
      "telecommute",
      "remote work",
      "flexible hours",
      "time off",
      "attendance",
      "tardiness"
    ]
  },
  "GA": {
    "name": "General Affairs",
    "color": "#4ECDC4",
    "keywords": [
      "office",
      "facility",
      "building",
      "renovation",
      "construction",
      "maintenance",
      "parking",
      "cafeteria",
      "dining",
      "kitchen",
      "pantry",
      "meeting room",
      "conference room",
      "desk",
      "chair",
      "equipment",
      "furniture",
      "supplies",
      "stationery",
      "it",
      "computer",
      "laptop",
      "printer",
      "network",
      "wifi",
      "telephone",
      "phone",
      "voip",
      "badge",
      "access card",
      "security",
      "alarm",
      "cctv",
      "surveillance",
      "key card",
      "entrance",
      "exit",
      "emergency",
      "evacuation",
      "fire",
      "safety",
      "health",
      "hygiene",
      "cleaning",
      "janitorial",
      "waste",
      "recycling",
      "utilities",
      "electricity",
      "water",
      "heating",
      "cooling",
      "air conditioning",
      "temperature"
    ]
  },
  "OTHER": {
    "name": "General / Unclassified",
    "color": "#95A5A6",
    "keywords": [
      "general",
      "question",
      "inquiry",
      "help",
      "support",
      "information",
      "clarification"
    ]
  }
}
```

### 2.2 Department Mapping Configuration

```json
{
  "departments": {
    "HR": {
      "id": 1,
      "code": "HR",
      "name": "Human Resources",
      "description": "Human Resources Department",
      "admin_group_id": "hr-admins",
      "admin_emails": [
        "hr-lead@company.com",
        "hr-admin@company.com"
      ],
      "color": "#FF6B6B",
      "icon": "people"
    },
    "GA": {
      "id": 2,
      "code": "GA",
      "name": "General Affairs",
      "description": "General Affairs / Facilities Department",
      "admin_group_id": "ga-admins",
      "admin_emails": [
        "ga-lead@company.com",
        "ga-admin@company.com"
      ],
      "color": "#4ECDC4",
      "icon": "building"
    },
    "OTHER": {
      "id": 3,
      "code": "OTHER",
      "name": "Other",
      "description": "General inquiries - default department",
      "admin_group_id": null,
      "admin_emails": [],
      "color": "#95A5A6",
      "icon": "help"
    }
  },
  "document_routing": {
    "HR": {
      "storage_prefix": "hr/",
      "index_prefix": "index_hr",
      "retention_days": 365
    },
    "GA": {
      "storage_prefix": "ga/",
      "index_prefix": "index_ga",
      "retention_days": 365
    },
    "OTHER": {
      "storage_prefix": "other/",
      "index_prefix": "index_other",
      "retention_days": 365
    }
  }
}
```

### 2.3 RBAC Permissions Configuration

```yaml
# config/rbac-permissions.yml

permissions:
  # Query and Chat
  QUERY_CHAT:
    description: "User can submit chat queries"
    resource: "query"
    action: "create"
    default_role: "user"

  QUERY_HISTORY:
    description: "User can view their query history"
    resource: "query"
    action: "view"
    default_role: "user"

  # Escalation Permissions
  ESCALATION_CREATE:
    description: "User can create escalation tickets"
    resource: "escalation"
    action: "create"
    default_role: "user"

  ESCALATION_VIEW:
    description: "Admin can view escalations"
    resource: "escalation"
    action: "view"
    default_role: "admin"

  ESCALATION_MANAGE:
    description: "Admin can manage escalation tickets"
    resource: "escalation"
    action: "update,delete"
    default_role: "admin"

  ESCALATION_STATS:
    description: "Admin can view escalation statistics"
    resource: "escalation"
    action: "stats"
    default_role: "admin"

  # Admin Messaging Permissions
  ADMIN_MESSAGE_SEND:
    description: "Admin can send messages"
    resource: "message"
    action: "create"
    default_role: "admin"

  ADMIN_MESSAGE_VIEW:
    description: "Admin can view messages"
    resource: "message"
    action: "view"
    default_role: "admin"

  ADMIN_MESSAGE_MANAGE:
    description: "Admin can manage messages"
    resource: "message"
    action: "update,delete"
    default_role: "admin"

  # FAQ Analytics Permissions
  FAQ_VIEW:
    description: "User/Admin can view FAQ analytics"
    resource: "faq"
    action: "view"
    default_role: "user"

  FAQ_MANAGE:
    description: "Admin can manage FAQ"
    resource: "faq"
    action: "update,delete"
    default_role: "admin"

  # Audit Log Permissions
  AUDIT_VIEW:
    description: "Compliance can view audit logs"
    resource: "audit"
    action: "view"
    default_role: "compliance"

  # Admin Dashboard
  ADMIN_DASHBOARD:
    description: "Admin can access admin dashboard"
    resource: "admin"
    action: "view"
    default_role: "admin"

# Role Definitions
roles:
  user:
    description: "Regular user"
    permissions:
      - QUERY_CHAT
      - QUERY_HISTORY
      - ESCALATION_CREATE
      - FAQ_VIEW

  admin:
    description: "Department administrator"
    permissions:
      - QUERY_CHAT
      - QUERY_HISTORY
      - ESCALATION_CREATE
      - ESCALATION_VIEW
      - ESCALATION_MANAGE
      - ESCALATION_STATS
      - ADMIN_MESSAGE_SEND
      - ADMIN_MESSAGE_VIEW
      - ADMIN_MESSAGE_MANAGE
      - FAQ_VIEW
      - FAQ_MANAGE
      - ADMIN_DASHBOARD

  compliance:
    description: "Compliance officer"
    permissions:
      - AUDIT_VIEW
      - FAQ_VIEW

  super_admin:
    description: "Super administrator"
    permissions:
      - "*" # All permissions
```

---

## Part 3: Sequelize Configuration

```typescript
// src/config/sequelize.config.ts

export const sequelizeConfig = {
  development: {
    username: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'root',
    database: process.env.MYSQL_DATABASE || 'expoproj',
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    dialect: 'mysql',
    logging: process.env.LOG_LEVEL === 'debug' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true
    }
  },
  
  staging: {
    username: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true
    }
  },
  
  production: {
    username: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true
    }
  }
};
```

---

## Part 4: Service Configuration

### 4.1 RAG Service Integration

```typescript
// src/config/ragService.config.ts

export const ragServiceConfig = {
  // RAG service endpoint
  url: process.env.RAG_SERVICE_URL || 'http://localhost:8000',
  
  // Request timeout (ms)
  timeout: parseInt(process.env.RAG_TIMEOUT || '30000'),
  
  // Enable department scoping
  departmentScoping: process.env.RAG_DEPARTMENT_SCOPING === 'true',
  
  // API endpoints
  endpoints: {
    query: '/api/query',
    health: '/api/health',
    search: '/api/search'
  },
  
  // Request configuration
  defaultParams: {
    top_k: 5, // Return top 5 documents
    similarity_threshold: 0.5,
    language_aware: true
  },
  
  // Retry policy
  retries: 3,
  retryDelay: 1000 // milliseconds
};
```

### 4.2 Audit Service Configuration

```typescript
// src/config/audit.config.ts

export const auditConfig = {
  // Enable/disable audit logging
  enabled: process.env.AUDIT_ENABLED === 'true',
  
  // Log all queries (may affect performance)
  logAllQueries: process.env.AUDIT_LOG_ALL_QUERIES === 'true',
  
  // Retention policy
  retention: {
    days: parseInt(process.env.AUDIT_RETENTION_DAYS || '365'),
    archiveAfterDays: 90,
    deleteAfterDays: 365
  },
  
  // Actions to log
  loggedActions: [
    'QUERY_CLASSIFICATION',
    'RAG_RETRIEVAL',
    'ANSWER_GENERATION',
    'ESCALATION_CREATE',
    'ESCALATION_UPDATE',
    'MESSAGE_SEND',
    'FAQ_TRACK',
    'DOCUMENT_ACCESS',
    'FAILED_OPERATION'
  ],
  
  // Batch configuration
  batchSize: 100,
  flushInterval: 5000 // milliseconds
};
```

---

## Part 5: Deployment Configuration

### 5.1 Docker Environment

```dockerfile
# Dockerfile excerpt

# Set environment variables for production
ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV AUDIT_ENABLED=true
ENV RAG_DEPARTMENT_SCOPING=true
ENV FEATURE_LANGUAGE_DETECTION=true
ENV FEATURE_DEPARTMENT_SCOPING=true
ENV FEATURE_SOURCE_ATTRIBUTION=true
ENV FEATURE_ESCALATION=true
ENV FEATURE_FAQ_ANALYTICS=true
ENV FEATURE_ADMIN_MESSAGING=true
```

### 5.2 Docker Compose Services

```yaml
# docker-compose.yml excerpt

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./setup-database.sh:/docker-entrypoint-initdb.d/setup.sh
    ports:
      - "3306:3306"

  api:
    build: ./api
    environment:
      MYSQL_HOST: mysql
      MYSQL_PORT: 3306
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      REDIS_HOST: redis
      RAG_SERVICE_URL: http://rag:8000
      NODE_ENV: production
    depends_on:
      - mysql
      - redis
    ports:
      - "3000:3000"

  rag:
    build: ./rag
    environment:
      CHROMA_HOST: chroma
      CHROMA_PORT: 8000
    ports:
      - "8000:8000"
```

---

## Part 6: Configuration Validation

### 6.1 Configuration Check Script

```bash
#!/bin/bash
# check-config.sh

echo "Checking Enterprise QA Bot Configuration..."
echo ""

# Check environment variables
echo "Checking environment variables..."
required_vars=(
  "MYSQL_HOST"
  "MYSQL_PORT"
  "MYSQL_USER"
  "MYSQL_PASSWORD"
  "MYSQL_DATABASE"
  "RAG_SERVICE_URL"
  "AUDIT_ENABLED"
)

missing_vars=()
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    missing_vars+=("$var")
  fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
  echo "❌ Missing environment variables:"
  for var in "${missing_vars[@]}"; do
    echo "   - $var"
  done
else
  echo "✓ All required environment variables set"
fi

echo ""

# Check file permissions
echo "Checking file permissions..."
if [ -f "setup-database.sh" ]; then
  chmod +x setup-database.sh
  echo "✓ setup-database.sh is executable"
else
  echo "❌ setup-database.sh not found"
fi

echo ""
echo "Configuration check complete!"
```

---

## Part 7: Configuration Best Practices

### Security

```
✓ Never commit .env files to version control
✓ Use environment variables for all secrets
✓ Rotate credentials regularly
✓ Use strong passwords for database
✓ Enable SSL/TLS for database connections
✓ Restrict RAG service access to internal network
```

### Performance

```
✓ Adjust database pool size based on load
✓ Set appropriate timeouts for RAG service
✓ Configure audit retention to manage disk space
✓ Enable request logging only when necessary
✓ Use read replicas for scaling
```

### Monitoring

```
✓ Monitor database connection pool
✓ Monitor RAG service response times
✓ Monitor audit log growth
✓ Monitor application errors
✓ Track query classification accuracy
```

---

## Part 8: Configuration Checklist

Before deployment, verify:

- [ ] Database connection configured and tested
- [ ] RAG service URL configured and accessible
- [ ] Redis connection configured
- [ ] Audit logging enabled
- [ ] RBAC permissions configured
- [ ] Triage keywords loaded
- [ ] Department mapping configured
- [ ] File upload path exists and writable
- [ ] SSL/TLS certificates configured (production)
- [ ] Backup strategy configured
- [ ] Monitoring and alerts configured
- [ ] Log rotation configured

---

## Conclusion

This configuration system provides:
- Flexible environment-based configuration
- Department-specific routing
- Comprehensive audit logging options
- RBAC permission management
- Scalability controls

See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for deployment instructions.

