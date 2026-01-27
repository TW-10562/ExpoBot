# Exact Code Changes - CSV i18n Fix

## File Modified
`/ui-2/src/components/UserManagement.tsx`

---

## Change 1: Added Normalization Helper Functions

**Location:** After `AREA_OF_WORK_OPTIONS` constant definition (around line 42)

**Added Code:**
```typescript
// Helper function to convert display labels to stable keys
// Accepts either stable keys or display labels and returns stable key
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
  const trimmed = value.trim().toLowerCase();
  
  // Check if it's already a stable key
  const areaKey = AREA_OF_WORK_OPTIONS.find(
    (opt) => opt.key === trimmed || opt.key === value.trim()
  )?.key;
  if (areaKey) return areaKey;
  
  // Try to match by display label (case-insensitive)
  const areaByLabel = AREA_OF_WORK_OPTIONS.find(
    (opt) => opt.label.toLowerCase() === trimmed
  )?.key;
  if (areaByLabel) return areaByLabel;
  
  // Fallback: return original value
  return value.trim();
};
```

---

## Change 2: Updated handleCSVUpload Function

**Location:** The CSV upload handler (around line 98)

**Old Code:**
```typescript
  // CSV Upload Handler - CSV must contain stable keys (e.g., 'ai_engineer', not 'AI Engineer')
  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        
        // Skip header row
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const newUsers: User[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.split(',').map(v => v.trim());
          
          // Map CSV columns to user fields
          const firstNameIdx = headers.indexOf('first name');
          const lastNameIdx = headers.indexOf('last name');
          const employeeIdIdx = headers.indexOf('employee id');
          const jobRoleIdx = headers.indexOf('user job role');
          const areaOfWorkIdx = headers.indexOf('area of work');
          const roleIdx = headers.indexOf('role');
          const passwordIdx = headers.indexOf('password');
          
          // CSV must contain stable keys (e.g., 'ai_engineer', 'ayase')
          const newUser: User = {
            id: String(users.length + newUsers.length + 1),
            firstName: values[firstNameIdx] || '',
            lastName: values[lastNameIdx] || '',
            employeeId: values[employeeIdIdx] || '',
            userJobRole: values[jobRoleIdx] || '', // Expects stable key like 'ai_engineer'
            areaOfWork: values[areaOfWorkIdx] || '', // Expects stable key like 'ayase'
            role: (values[roleIdx]?.toLowerCase() === 'admin' ? 'admin' : 'user'),
            password: values[passwordIdx] || '',
            lastUpdated: new Date(),
          };
          
          if (newUser.firstName && newUser.lastName) {
            newUsers.push(newUser);
          }
        }
        
        setUsers([...users, ...newUsers]);
        setCsvLoading(false);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('CSV parsing error:', error);
        setCsvLoading(false);
      }
    };
    
    reader.readAsText(file);
  };
```

**New Code:**
```typescript
  // CSV Upload Handler - accepts both stable keys and display labels
  // e.g., can accept either 'ai_engineer' or 'AI Engineer' and normalizes to 'ai_engineer'
  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        
        // Skip header row
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const newUsers: User[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.split(',').map(v => v.trim());
          
          // Map CSV columns to user fields
          const firstNameIdx = headers.indexOf('first name');
          const lastNameIdx = headers.indexOf('last name');
          const employeeIdIdx = headers.indexOf('employee id');
          const jobRoleIdx = headers.indexOf('user job role');
          const areaOfWorkIdx = headers.indexOf('area of work');
          const roleIdx = headers.indexOf('role');
          const passwordIdx = headers.indexOf('password');
          
          // Normalize job role and area to stable keys (supports both stable keys and display labels)
          const jobRoleValue = values[jobRoleIdx] || '';
          const areaValue = values[areaOfWorkIdx] || '';
          
          const newUser: User = {
            id: String(users.length + newUsers.length + 1),
            firstName: values[firstNameIdx] || '',
            lastName: values[lastNameIdx] || '',
            employeeId: values[employeeIdIdx] || '',
            userJobRole: normalizeJobRole(jobRoleValue), // Converts display label to stable key
            areaOfWork: normalizeArea(areaValue), // Converts display label to stable key
            role: (values[roleIdx]?.toLowerCase() === 'admin' ? 'admin' : 'user'),
            password: values[passwordIdx] || '',
            lastUpdated: new Date(),
          };
          
          if (newUser.firstName && newUser.lastName) {
            newUsers.push(newUser);
          }
        }
        
        setUsers([...users, ...newUsers]);
        setCsvLoading(false);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('CSV parsing error:', error);
        setCsvLoading(false);
      }
    };
    
    reader.readAsText(file);
  };
```

**Key Changes:**
1. Updated JSDoc comment to indicate both formats are accepted
2. Added explicit variables for job role and area values
3. Changed storage lines:
   - OLD: `userJobRole: values[jobRoleIdx] || ''`
   - NEW: `userJobRole: normalizeJobRole(jobRoleValue)`
   - OLD: `areaOfWork: values[areaOfWorkIdx] || ''`
   - NEW: `areaOfWork: normalizeArea(areaValue)`

---

## How It Works

### normalizeJobRole Function Flow
```
Input: "AI Engineer" (from CSV)
  ↓
Trim & lowercase: "ai engineer"
  ↓
Check stable key match: JOB_ROLE_OPTIONS.find(opt => opt.key === "ai engineer") → NO MATCH
  ↓
Check display label match: JOB_ROLE_OPTIONS.find(opt => opt.label.toLowerCase() === "ai engineer") → 
  Finds { key: 'ai_engineer', label: 'AI Engineer' }
  ↓
Return: 'ai_engineer'
```

### normalizeArea Function Flow
```
Input: "Akihabara Main Building" (from CSV)
  ↓
Trim & lowercase: "akihabara main building"
  ↓
Check stable key match: NO MATCH
  ↓
Check display label match: Finds { key: 'akihabara_main', label: 'Akihabara Main Building' }
  ↓
Return: 'akihabara_main'
```

---

## Test Cases

The fix handles these CSV inputs correctly:

| Input | Stored As | Table Displays | Works? |
|-------|-----------|----------------|--------|
| "AI Engineer" | "ai_engineer" | "AI Engineer" | ✅ |
| "ai_engineer" | "ai_engineer" | "AI Engineer" | ✅ |
| "AI ENGINEER" | "ai_engineer" | "AI Engineer" | ✅ |
| "Ayase" | "ayase" | "Ayase" | ✅ |
| "ayase" | "ayase" | "Ayase" | ✅ |
| "AYASE" | "ayase" | "Ayase" | ✅ |
| "" (empty) | "" | (empty) | ✅ |
| "Unknown Role" | "Unknown Role" | (custom text) | ✅ |

---

## Backend Integration

**No backend changes required!** 

The fix is entirely frontend-based. The backend receives the same stable key format as before:
- Previously: Required CSV with stable keys only
- Now: Accepts both formats, normalizes on frontend before sending

**If the backend validates job roles:**
```typescript
// Backend still receives: { userJobRole: "ai_engineer", areaOfWork: "ayase" }
// No validation changes needed
```

---

## Files NOT Changed
- `/ui-2/src/translations/en.json` - Translation keys already exist
- `/ui-2/src/translations/ja.json` - Translation keys already exist  
- `/ui-2/src/context/LanguageContext.tsx` - t() function unchanged
- Backend files - Zero backend changes needed
- Database schema - No migration needed
