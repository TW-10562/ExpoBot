# Before and After: CSV i18n Issue Fix

## Before Fix ❌

### Symptom
When uploading CSV, table displayed:
```
Job Role: "user.jobRole.AI Engineer"
Area: "user.area.Ayase"
```

### What Was Happening

**CSV Upload Flow (Broken):**
```
CSV: "AI Engineer"
  ↓
CSV Handler: Stored directly as-is
  ↓
Database: { userJobRole: "AI Engineer" }
  ↓
Table Render: t("user.jobRole.AI Engineer") 
  ↓
Translation File DOESN'T have "user.jobRole.AI Engineer" key
  ↓
i18n Fallback: Display the key itself
  ↓
Result: "user.jobRole.AI Engineer" shown to user ❌
```

**UI Form Flow (Worked):**
```
Dropdown Select: "AI Engineer" clicked
  ↓
onChange Handler: Stores option.key = "ai_engineer"
  ↓
Database: { userJobRole: "ai_engineer" }
  ↓
Table Render: t("user.jobRole.ai_engineer")
  ↓
Translation File HAS "user.jobRole.ai_engineer": "AI Engineer"
  ↓
Result: "AI Engineer" displayed correctly ✅
```

### Code Changes Needed (Before)
❌ NO normalization in CSV handler
```typescript
userJobRole: values[jobRoleIdx] || '' // Stores as-is, could be "AI Engineer"
```

---

## After Fix ✅

### Result
Both CSV and UI form now display correctly:
```
Job Role: "AI Engineer" ✅
Area: "Ayase" ✅
Language switching: Instant ✅
```

### What's Happening Now

**CSV Upload Flow (Fixed):**
```
CSV: "AI Engineer"
  ↓
normalizeJobRole("AI Engineer") function:
  - Check if it's already stable key "ai_engineer" → NO
  - Check if display label matches "AI Engineer" → YES
  - Return "ai_engineer"
  ↓
Database: { userJobRole: "ai_engineer" }
  ↓
Table Render: t("user.jobRole.ai_engineer")
  ↓
Translation File HAS key: "user.jobRole.ai_engineer": "AI Engineer"
  ↓
Result: "AI Engineer" displayed correctly ✅
```

**UI Form Flow (Unchanged - Already Worked):**
```
Dropdown Select: "AI Engineer" clicked
  ↓
onChange Handler: Stores option.key = "ai_engineer"
  ↓
Database: { userJobRole: "ai_engineer" }
  ↓
Table Render: t("user.jobRole.ai_engineer")
  ↓
Translation File HAS key
  ↓
Result: "AI Engineer" displayed correctly ✅
```

### Code Changes Made (After)
✅ Added normalization functions
```typescript
const normalizeJobRole = (value: string): string => {
  // Converts "AI Engineer" or "ai_engineer" → "ai_engineer"
  // Handles case-insensitive matching
};

const normalizeArea = (value: string): string => {
  // Converts "Ayase" or "ayase" → "ayase"
  // Handles case-insensitive matching
};
```

✅ Updated CSV handler to use normalization
```typescript
userJobRole: normalizeJobRole(values[jobRoleIdx] || '') // Always stores stable key
areaOfWork: normalizeArea(values[areaOfWorkIdx] || '') // Always stores stable key
```

---

## Side-by-Side Comparison

| Aspect | Before | After |
|--------|--------|-------|
| CSV with "AI Engineer" | ❌ Shows "user.jobRole.AI Engineer" | ✅ Shows "AI Engineer" |
| CSV with "ai_engineer" | ❌ Shows "user.jobRole.ai_engineer" | ✅ Shows "AI Engineer" |
| UI Form Dropdown | ✅ Shows "AI Engineer" | ✅ Shows "AI Engineer" |
| Language Toggle | ❌ Form works, CSV doesn't | ✅ Both work perfectly |
| Storage Format | Inconsistent (labels or keys) | ✅ Always stable keys |
| Backend Involved | No (frontend only) | No (frontend only) |

---

## Impact Summary

### What Was Fixed
- CSV upload now handles both display labels and stable keys
- All user data stored with consistent stable key format
- Language switching works for CSV-uploaded users
- Users don't need to know about "stable keys" - they can use labels

### What Stayed the Same
- UI form behavior (already correct)
- Database schema (no changes)
- Translation files (already correct structure)
- No backend API changes needed
- Component props and interfaces (no breaking changes)

### User Experience Improvement
**Before:** Users uploading CSV with job roles would see broken i18n keys
**After:** CSV upload works seamlessly, behaves identically to form input
