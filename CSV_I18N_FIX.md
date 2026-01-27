# CSV Upload i18n Fix - Complete Solution

## Problem Analysis

When uploading users via CSV, the table displayed untranslated i18n keys like:
- `"user.jobRole.AI Engineer"` instead of `"AI Engineer"`
- `"user.area.Ayase"` instead of `"Ayase"`

But adding users via the UI form worked correctly, displaying translated values.

### Root Cause
The CSV handler was storing raw values from the CSV file without normalizing them to stable keys. When a CSV file contained display labels (e.g., "AI Engineer"), they were stored as-is. The table then tried to translate with `t('user.jobRole.AI Engineer')`, which doesn't exist in the translation files, causing i18n to fall back to displaying the key itself.

### Why It Happened
- UI form stores stable keys (`'ai_engineer'`) → Table translates correctly with `t('user.jobRole.ai_engineer')` ✅
- CSV stored whatever was in the file → If it had labels, stored labels directly → Table couldn't translate → Fallback display ❌

## Solution Implemented

Added two helper functions to **normalize CSV values to stable keys**:

```typescript
// Converts job role display labels or stable keys to stable keys
const normalizeJobRole = (value: string): string => {
  const trimmed = value.trim().toLowerCase();
  
  // Check if it's already a stable key
  const jobRoleKey = JOB_ROLE_OPTIONS.find(
    (opt) => opt.key === trimmed || opt.key === value.trim()
  )?.key;
  if (jobRoleKey) return jobRoleKey;
  
  // Try to match by display label (case-insensitive)
  const jobRoleByLabel = JOB_ROLE_OPTIONS.find(
    (opt) => opt.label.toLowerCase() === trimmed
  )?.key;
  if (jobRoleByLabel) return jobRoleByLabel;
  
  // Fallback: return original value
  return value.trim();
};

const normalizeArea = (value: string): string => {
  // Same logic for area of work...
};
```

### How It Works
1. **Accepts both formats:** Stable keys (`'ai_engineer'`) OR display labels (`'AI Engineer'`)
2. **Case-insensitive matching:** Works with any case variation
3. **Smart normalization:** Converts to stable key before storing
4. **Fallback support:** Returns original if no match found (for custom values)

## Updated CSV Handler

The CSV upload now uses normalization:

```typescript
const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  // ... CSV parsing ...
  
  // BEFORE: Stored raw values
  // userJobRole: values[jobRoleIdx] || ''
  
  // AFTER: Normalizes to stable keys
  userJobRole: normalizeJobRole(values[jobRoleIdx] || '')
  areaOfWork: normalizeArea(values[areaOfWorkIdx] || '')
};
```

## Result: Consistent Behavior

### CSV Upload Flow
```
CSV File: "AI Engineer", "Ayase"
  ↓
normalizeJobRole("AI Engineer") → "ai_engineer"
normalizeArea("Ayase") → "ayase"
  ↓
Stored in State: { userJobRole: "ai_engineer", areaOfWork: "ayase" }
  ↓
Table Display: t("user.jobRole.ai_engineer") → "AI Engineer" ✅
```

### UI Form Flow
```
Form Input: Select "AI Engineer" from dropdown
  ↓
onChange stores: { userJobRole: "ai_engineer" }
  ↓
Table Display: t("user.jobRole.ai_engineer") → "AI Engineer" ✅
```

## CSV Format Flexibility

Users can now upload CSVs in either format:

**Option 1: Display Labels (Human-Readable)**
```csv
first name,last name,employee id,user job role,area of work,role,password
John,Doe,EMP001,AI Engineer,Ayase,user,pass123
Jane,Smith,EMP002,System Engineer,Ebina,admin,pass456
```

**Option 2: Stable Keys (Technical)**
```csv
first name,last name,employee id,user job role,area of work,role,password
John,Doe,EMP001,ai_engineer,ayase,user,pass123
Jane,Smith,EMP002,system_engineer,ebina,admin,pass456
```

Both are normalized to the same result before storage.

## Files Changed
- `/ui-2/src/components/UserManagement.tsx`
  - Added `normalizeJobRole()` helper function
  - Added `normalizeArea()` helper function
  - Updated `handleCSVUpload()` to use normalization functions

## Testing Checklist
- [ ] Upload CSV with display labels → Verify table shows translated values
- [ ] Upload CSV with stable keys → Verify table shows translated values
- [ ] Add user via form → Verify behavior matches CSV upload
- [ ] Switch language → Verify all values translate correctly
- [ ] Mix of caps/lowercase in CSV → Verify normalization handles it

## Key Insights
1. **Frontend normalization is better:** Handles the issue at the source before storage
2. **Flexible input:** Accepts both human-readable and technical formats
3. **Consistent storage:** All methods store stable keys, enabling proper i18n
4. **No backend changes required:** Pure frontend solution
5. **Language switching works:** Table will instantly translate when language changes
