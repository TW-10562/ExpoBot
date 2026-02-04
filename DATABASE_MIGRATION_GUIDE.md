# Database Migration Guide

## Using Sequelize Migrations

### Generate Migrations from Models

```bash
# Generate migration files (Sequelize CLI)
npx sequelize-cli migration:generate --name create-enterprise-qa-tables

# Apply migrations
npx sequelize-cli db:migrate

# Rollback if needed
npx sequelize-cli db:migrate:undo
```

## Manual SQL for Reference

### Create Department Table
```sql
CREATE TABLE IF NOT EXISTS `department` (
  `id` INTEGER PRIMARY KEY AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `admin_group_id` INTEGER,
  `is_active` BOOLEAN DEFAULT true,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (`code`),
  INDEX idx_is_active (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Create File-Department Mapping
```sql
CREATE TABLE IF NOT EXISTS `file_department` (
  `id` INTEGER PRIMARY KEY AUTO_INCREMENT,
  `file_id` INTEGER NOT NULL,
  `department_id` INTEGER NOT NULL,
  `is_primary` BOOLEAN DEFAULT false,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_file_dept (`file_id`, `department_id`),
  INDEX idx_file_id (`file_id`),
  INDEX idx_department_id (`department_id`),
  FOREIGN KEY (`department_id`) REFERENCES `department`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Create Query Classification Log
```sql
CREATE TABLE IF NOT EXISTS `query_classification` (
  `id` INTEGER PRIMARY KEY AUTO_INCREMENT,
  `query_id` VARCHAR(64) NOT NULL,
  `user_id` BIGINT NOT NULL,
  `original_query` TEXT NOT NULL,
  `detected_language` VARCHAR(10) NOT NULL,
  `classified_department` INTEGER,
  `classification_confidence` DECIMAL(5,2) DEFAULT 0,
  `detected_keywords` JSON,
  `rag_triggered` BOOLEAN DEFAULT false,
  `source_document_ids` JSON,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_query_id (`query_id`),
  INDEX idx_user_id (`user_id`),
  INDEX idx_department (`classified_department`),
  INDEX idx_created_at (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Create Audit Log Table
```sql
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id` BIGINT,
  `action_type` VARCHAR(50) NOT NULL,
  `resource_type` VARCHAR(50) NOT NULL,
  `resource_id` VARCHAR(100),
  `department_id` INTEGER,
  `description` TEXT NOT NULL,
  `details` JSON,
  `ip_address` VARCHAR(50),
  `user_agent` TEXT,
  `status` VARCHAR(20) DEFAULT 'SUCCESS',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id_created (`user_id`, `created_at`),
  INDEX idx_department_created (`department_id`, `created_at`),
  INDEX idx_action_type (`action_type`, `created_at`),
  INDEX idx_resource_type (`resource_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Create Escalation Table
```sql
CREATE TABLE IF NOT EXISTS `escalation` (
  `id` INTEGER PRIMARY KEY AUTO_INCREMENT,
  `ticket_number` VARCHAR(50) NOT NULL UNIQUE,
  `user_id` BIGINT NOT NULL,
  `original_query` TEXT NOT NULL,
  `bot_answer` TEXT,
  `source_documents` JSON,
  `department_id` INTEGER NOT NULL,
  `assigned_admin_id` BIGINT,
  `reason` TEXT,
  `status` VARCHAR(20) DEFAULT 'OPEN',
  `resolution_notes` TEXT,
  `resolved_at` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ticket_number (`ticket_number`),
  INDEX idx_user_id (`user_id`),
  INDEX idx_department_status (`department_id`, `status`),
  INDEX idx_assigned_admin (`assigned_admin_id`, `status`),
  FOREIGN KEY (`department_id`) REFERENCES `department`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Create Admin Message Table
```sql
CREATE TABLE IF NOT EXISTS `admin_message` (
  `id` INTEGER PRIMARY KEY AUTO_INCREMENT,
  `sender_admin_id` BIGINT NOT NULL,
  `message_type` VARCHAR(20) NOT NULL,
  `recipient_user_id` BIGINT,
  `recipient_department_id` INTEGER,
  `title` VARCHAR(200) NOT NULL,
  `content` TEXT NOT NULL,
  `mentions` JSON,
  `is_pinned` BOOLEAN DEFAULT false,
  `is_read` BOOLEAN DEFAULT false,
  `read_at` DATETIME,
  `expires_at` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_recipient_user_read (`recipient_user_id`, `is_read`),
  INDEX idx_sender_admin (`sender_admin_id`, `created_at`),
  INDEX idx_recipient_dept (`recipient_department_id`, `created_at`),
  INDEX idx_is_pinned (`is_pinned`),
  INDEX idx_expires_at (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Create FAQ Analytics Table
```sql
CREATE TABLE IF NOT EXISTS `faq_analytics` (
  `id` INTEGER PRIMARY KEY AUTO_INCREMENT,
  `department_id` INTEGER NOT NULL,
  `query_hash` VARCHAR(64) NOT NULL,
  `normalized_query` TEXT NOT NULL,
  `query_language` VARCHAR(10) DEFAULT 'en',
  `frequency` INTEGER DEFAULT 1,
  `source_document_id` INTEGER,
  `answer_quality_score` DECIMAL(5,2) DEFAULT 0,
  `is_faq_candidate` BOOLEAN DEFAULT false,
  `last_queried_at` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_dept_hash (`department_id`, `query_hash`),
  INDEX idx_department_freq (`department_id`, `frequency`),
  INDEX idx_faq_candidate (`is_faq_candidate`, `frequency`),
  FOREIGN KEY (`department_id`) REFERENCES `department`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Initialization Data

### Seed Departments
```sql
INSERT INTO department (code, name, description, is_active)
VALUES 
  ('HR', 'Human Resources', 'HR policies, benefits, leave management', true),
  ('GA', 'General Affairs', 'Office facilities, general administrative', true),
  ('OTHER', 'General Queries', 'Uncategorized and general knowledge', true);
```

### Map Initial Documents (Example)
```sql
-- Assuming you have existing documents with IDs 1-10 marked for HR

INSERT INTO file_department (file_id, department_id, is_primary)
SELECT f.id, d.id, true 
FROM file f, department d
WHERE d.code = 'HR' 
AND f.filename LIKE '%HR%' 
OR f.filename LIKE '%benefits%'
OR f.filename LIKE '%leave%'
OR f.filename LIKE '%salary%';

-- Do the same for GA documents
INSERT INTO file_department (file_id, department_id, is_primary)
SELECT f.id, d.id, true 
FROM file f, department d
WHERE d.code = 'GA' 
AND f.filename LIKE '%office%' 
OR f.filename LIKE '%facilities%'
OR f.filename LIKE '%equipment%';
```

## Verification Queries

### Verify Department Setup
```sql
SELECT d.id, d.code, d.name, d.is_active, COUNT(fd.id) as document_count
FROM department d
LEFT JOIN file_department fd ON d.id = fd.department_id
GROUP BY d.id;
```

### Verify File-Department Mapping
```sql
SELECT f.id, f.filename, GROUP_CONCAT(d.code) as departments
FROM file f
LEFT JOIN file_department fd ON f.id = fd.file_id
LEFT JOIN department d ON fd.department_id = d.id
GROUP BY f.id;
```

### Check Audit Log Growth
```sql
SELECT 
  DATE(created_at) as date,
  action_type,
  COUNT(*) as count
FROM audit_log
GROUP BY DATE(created_at), action_type
ORDER BY DATE(created_at) DESC, count DESC;
```

### Check Escalation Status
```sql
SELECT 
  status,
  d.code as department,
  COUNT(*) as count,
  AVG(DATEDIFF(resolved_at, created_at)) as avg_resolution_days
FROM escalation e
LEFT JOIN department d ON e.department_id = d.id
GROUP BY status, d.id;
```

### Check FAQ Candidates
```sql
SELECT 
  d.code as department,
  f.normalized_query,
  f.frequency,
  f.answer_quality_score,
  f.is_faq_candidate
FROM faq_analytics f
LEFT JOIN department d ON f.department_id = d.id
WHERE f.is_faq_candidate = true
ORDER BY f.frequency DESC
LIMIT 10;
```

## Backup & Recovery

### Create Backup Before Deployment
```bash
# MySQL backup
mysqldump -u root -p expo_db > backup_before_enterprise_qa.sql

# Or with docker
docker exec expo_db mysqldump -u root -p expo_db > backup.sql
```

### Restore if Needed
```bash
# MySQL restore
mysql -u root -p expo_db < backup_before_enterprise_qa.sql

# Or with docker
docker exec -i expo_db mysql -u root -p expo_db < backup.sql
```

## Index Maintenance

### After Initial Data Load
```sql
-- Optimize tables for better performance
OPTIMIZE TABLE department;
OPTIMIZE TABLE file_department;
OPTIMIZE TABLE query_classification;
OPTIMIZE TABLE audit_log;
OPTIMIZE TABLE escalation;
OPTIMIZE TABLE admin_message;
OPTIMIZE TABLE faq_analytics;

-- Analyze table statistics
ANALYZE TABLE department;
ANALYZE TABLE file_department;
ANALYZE TABLE query_classification;
ANALYZE TABLE audit_log;
ANALYZE TABLE escalation;
ANALYZE TABLE admin_message;
ANALYZE TABLE faq_analytics;
```

### Monitor Table Sizes
```sql
SELECT 
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) as size_mb
FROM information_schema.tables
WHERE table_schema = 'expo_db'
AND table_name IN (
  'department',
  'file_department',
  'query_classification',
  'audit_log',
  'escalation',
  'admin_message',
  'faq_analytics'
)
ORDER BY size_mb DESC;
```

## Archival & Cleanup

### Archive Old Audit Logs
```sql
-- Move old records to archive table (optional)
INSERT INTO audit_log_archive
SELECT * FROM audit_log
WHERE created_at < DATE_SUB(NOW(), INTERVAL 365 DAY);

DELETE FROM audit_log
WHERE created_at < DATE_SUB(NOW(), INTERVAL 365 DAY);
```

### Cleanup Expired Messages
```sql
DELETE FROM admin_message
WHERE expires_at < NOW();
```

### Cleanup Old FAQ Analytics
```sql
-- Keep only active FAQs and recent queries
DELETE FROM faq_analytics
WHERE last_queried_at < DATE_SUB(NOW(), INTERVAL 180 DAY)
AND is_faq_candidate = false;
```

## Migration Checklist

- [ ] Backup existing database
- [ ] Review all SQL DDL statements
- [ ] Test migrations on staging
- [ ] Create migration files
- [ ] Document rollback procedure
- [ ] Get DBA approval
- [ ] Schedule deployment window
- [ ] Execute migrations in production
- [ ] Verify all tables created
- [ ] Verify all indexes created
- [ ] Seed initial data
- [ ] Run verification queries
- [ ] Monitor for issues
- [ ] Document completion

