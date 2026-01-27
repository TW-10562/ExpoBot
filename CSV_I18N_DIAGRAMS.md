# CSV i18n Fix - Visual Flow Diagrams

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     User Management System                  │
└─────────────────────────────────────────────────────────────┘
                              │
                 ┌────────────┼────────────┐
                 │            │            │
         ┌───────▼────┐  ┌────▼────┐  ┌──▼─────────┐
         │  CSV File  │  │  Form   │  │  Language  │
         │   Upload   │  │  Input  │  │  Context   │
         └───────┬────┘  └────┬────┘  └──┬─────────┘
                 │            │          │
                 │   Normalize│(stable) │
                 │   Jobs &   │          │
                 │   Areas    │          │
                 │            │          │
         ┌───────▼──────┬─────▼────────┬─▼──────────┐
         │              │              │            │
    Store stable keys  Store stable   Provide      │
    ai_engineer,       keys directly translations │
    ayase, etc.        from form      en.json,    │
                                      ja.json     │
         │              │              │            │
         └───────┬──────┴──────────────┴────────────┘
                 │
                 │ All store: stable keys
                 │
         ┌───────▼────────────────────┐
         │    User State (unified)    │
         │  userJobRole: "ai_engineer"│
         │  areaOfWork: "ayase"       │
         └───────┬────────────────────┘
                 │
         ┌───────▼────────────────────┐
         │  Table Display Layer       │
         │  t('user.jobRole.ai_...")  │
         │  → Looks up translation    │
         │  → Displays in cur language│
         └───────┬────────────────────┘
                 │
         ┌───────▼────────────────────┐
         │   User Sees (English)      │
         │   "AI Engineer"            │
         │   "Ayase"                  │
         └───────────────────────────┘
         
         ┌───────────────────────────┐
         │   User Sees (Japanese)    │
         │   "AIエンジニア"          │
         │   "綾瀬"                   │
         └───────────────────────────┘
```

---

## CSV Processing Flow (BEFORE Fix)

```
┌──────────────────────┐
│  CSV File Uploaded   │
│  "AI Engineer"       │
│  "Ayase"             │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────┐
│ CSV Handler (Old)        │
│ - Read CSV line          │
│ - Extract "AI Engineer"  │
│ - Store as-is (no check) │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  User State (Broken)     │
│  userJobRole:            │
│    "AI Engineer"  ❌     │
│  (Not a valid key!)      │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Table Display                   │
│  t('user.jobRole.AI Engineer')   │
│  [NOT FOUND in en.json!]         │
└──────────┬───────────────────────┘
           │
           ▼ (i18n fallback)
┌──────────────────────────────────┐
│  User Sees (BROKEN)              │
│  "user.jobRole.AI Engineer" ❌  │
│  (Key displayed instead)         │
└──────────────────────────────────┘
```

---

## CSV Processing Flow (AFTER Fix)

```
┌──────────────────────────────────┐
│  CSV File Uploaded               │
│  - "AI Engineer" (display label) │
│  - "ayase" (stable key)          │
│  - "SYSTEM ENGINEER" (mixed)     │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ CSV Handler (New - Improved)         │
│ 1. Read CSV row: "AI Engineer"       │
│ 2. Call normalizeJobRole()           │
│    - Check if stable key: NO         │
│    - Check display labels: YES!      │
│    - Find: { key: "ai_engineer" }   │
│ 3. Store normalized: "ai_engineer"   │
│ 4. Repeat for area: "ayase" → OK    │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  User State (Correct)                │
│  userJobRole: "ai_engineer" ✅      │
│  areaOfWork: "ayase" ✅             │
│  (Valid translation keys!)           │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Table Display                       │
│  t('user.jobRole.ai_engineer')      │
│  [FOUND in en.json!]                 │
└──────────┬───────────────────────────┘
           │
           ▼ (correct translation)
┌──────────────────────────────────────┐
│  User Sees (CORRECT)                 │
│  English: "AI Engineer" ✅           │
│  Japanese: "AIエンジニア" ✅        │
│  (Translates correctly!)             │
└──────────────────────────────────────┘
```

---

## Normalization Function Flow

### normalizeJobRole("AI Engineer")
```
┌──────────────────────┐
│ Input: "AI Engineer" │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────┐
│ Step 1: Trim & Lowercase     │
│ "ai engineer"                │
└──────────┬───────────────────┘
           │
           ▼
┌────────────────────────────────────────────────┐
│ Step 2: Check Stable Key Match                 │
│ Find option where opt.key === "ai engineer"    │
│ JOB_ROLE_OPTIONS = [                           │
│   { key: "ai_engineer", ... },  ← No match    │
│   { key: "system_engineer", ... }              │
│   ...                                          │
│ ]                                              │
│ Result: NO MATCH ✗                            │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│ Step 3: Check Display Label Match               │
│ Find option where opt.label.toLowerCase()       │
│              === "ai engineer"                  │
│ JOB_ROLE_OPTIONS = [                           │
│   { key: "ai_engineer",                        │
│     label: "AI Engineer" },  ← MATCH! ✓       │
│   { key: "system_engineer", ... }              │
│   ...                                          │
│ ]                                              │
│ Found: { key: "ai_engineer", ... }            │
│ Return: "ai_engineer"                          │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────┐
│ Output: "ai_engineer"    │
│ (Stable key)             │
└──────────────────────────┘
```

### normalizeJobRole("ai_engineer") - Already a Key
```
┌──────────────────────────┐
│ Input: "ai_engineer"     │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Step 1: Trim & Lowercase     │
│ "ai_engineer"                │
└──────────┬───────────────────┘
           │
           ▼
┌───────────────────────────────────────────┐
│ Step 2: Check Stable Key Match            │
│ Find option where opt.key === "ai_engineer"
│ JOB_ROLE_OPTIONS = [                      │
│   { key: "ai_engineer", ... } ← MATCH! ✓│
│   ...                                     │
│ ]                                         │
│ Return: "ai_engineer"                     │
└──────────┬──────────────────────────────┘
           │
           ▼
┌──────────────────────────┐
│ Output: "ai_engineer"    │
│ (Stable key - unchanged) │
└──────────────────────────┘
```

---

## Language Toggle Effect

### Before Fix
```
CSV Data State:          UI Display:              Language Switch:
userJobRole:             Table shows:             English → Japanese
"AI Engineer"  ❌       "user.jobRole.          NO CHANGE ❌
               (Wrong)   AI Engineer" ❌          (Key shown, not
                        (Key fallback)            translatable)


Form Data State:         UI Display:              Language Switch:
userJobRole:            Table shows:             English → Japanese
"ai_engineer" ✅       "AI Engineer" ✅         "AIエンジニア" ✅
(Correct)               (Correct)                (Works perfectly)
```

### After Fix  
```
CSV Data State:          UI Display:              Language Switch:
userJobRole:             Table shows:             English → Japanese
"ai_engineer" ✅        "AI Engineer" ✅         "AIエンジニア" ✅
(Normalized!)            (Correct)               (Works perfectly!)

Form Data State:         UI Display:              Language Switch:
userJobRole:             Table shows:             English → Japanese
"ai_engineer" ✅        "AI Engineer" ✅         "AIエンジニア" ✅
(Still correct)          (Still correct)         (Still works)

✅ BOTH PATHS PRODUCE IDENTICAL RESULTS
```

---

## CSV Format Acceptance

```
CSV Contains:                  normalizeJobRole()              Stored As:
────────────────────────────────────────────────────────────────────────
"AI Engineer"          →        Matches label        →        "ai_engineer"
"ai_engineer"          →        Matches key          →        "ai_engineer"
"AI ENGINEER"          →        Matches label (CI)   →        "ai_engineer"
"Ai Engineer"          →        Matches label (CI)   →        "ai_engineer"
"AI_ENGINEER"          →        No match, return     →        "AI_ENGINEER"
                                original                       (custom value)
""  (empty)            →        Return original      →        ""  (empty)
"Unknown Role"         →        Return original      →        "Unknown Role"
                                                               (backend validates)
```

---

## Data Flow Diagram

```
                    ┌─────────────────┐
                    │   CSV File      │
                    │  or Form Input  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Raw Value     │
                    │"AI Engineer" or │
                    │"ai_engineer"    │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        │         From CSV        From Form
        │
    ┌───▼──────────┐      ┌──────▼──────────┐
    │Normalize Job │      │Option.key from  │
    │Role/Area     │      │dropdown object  │
    │              │      │                 │
    │Converts      │      │Always stable    │
    │display label │      │key already      │
    │to stable key │      │                 │
    └───┬──────────┘      └──────┬──────────┘
        │                       │
        │        Stable Keys    │
        │        ("ai_engineer" │
        │         "ayase"       │
        │         "admin")      │
        │                       │
        └───────────┬───────────┘
                    │
            ┌───────▼────────┐
            │  User State    │
            │  Store in      │
            │  memory/DB     │
            └───────┬────────┘
                    │
            ┌───────▼────────────────┐
            │  Table Render Layer    │
            │  t('user.jobRole.$key')│
            │  t('user.area.$key')   │
            └───────┬────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        │      ┌────▼──┐   ┌────▼──┐
        │      │English│   │Japanese│
        │      │ trans │   │ trans  │
        │      │ keys  │   │ keys   │
        │      └────┬──┘   └────┬──┘
        │           │           │
        │    ┌──────▼────────┬──▼──────┐
        │    │                        │
        │    ▼                        ▼
        │ "AI Engineer"          "AIエンジニア"
        │ "Ayase"                "綾瀬"
        │
        └─► Display to User
```

---

## State Consistency Guarantee

```
Initial CSV:                 Final Display:              Language:
─────────────────────────────────────────────────────────────────────

"AI Engineer"  ──┐                                    English:
"System Eng"   ──┼─ Normalize ─┐      ┌─ Translate ─ "AI Engineer"
"Ayase"        ──┤    to        ├─ Store ┤            "System Engineer"
"Ebina"        ──┼─  stable     │  in    └─ Translate ─ "Ayase"
               ──┤   keys       │  state    (Japanese) "海老名"
               ──┘                                    etc.

✅ GUARANTEE: Any CSV input produces consistent state
✅ GUARANTEE: Same state → Same display in any language
✅ GUARANTEE: Form input produces identical state
```

---

## Testing Verification Matrix

```
Test Input Format        Normalization Result    Display (English)    Display (Japanese)
──────────────────────────────────────────────────────────────────────────────────────
"AI Engineer"           → "ai_engineer"         → "AI Engineer" ✅    → "AIエンジニア" ✅
"ai_engineer"           → "ai_engineer"         → "AI Engineer" ✅    → "AIエンジニア" ✅
"AI ENGINEER"           → "ai_engineer"         → "AI Engineer" ✅    → "AIエンジニア" ✅
"Ayase"                 → "ayase"               → "Ayase" ✅          → "綾瀬" ✅
"akihabara_main"        → "akihabara_main"      → "Akihabara Main..." → "秋葉原本館" ✅
"AKIHABARA MAIN"        → "akihabara_main"      → "Akihabara Main..." → "秋葉原本館" ✅
Empty ""                → ""                    → (empty) ✅          → (empty) ✅
"Unknown"               → "Unknown"             → "Unknown"           → "Unknown"
                                                 (custom value)       (custom value)
```

---

## Summary of Fixes

```
┌──────────────────────────────────────────────────────────┐
│                      THE FIX                             │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ADDED: 2 Normalization Functions                        │
│  ├─ normalizeJobRole(value)                             │
│  └─ normalizeArea(value)                                │
│                                                           │
│  UPDATED: CSV Upload Handler                            │
│  ├─ Call normalizeJobRole() on job role input           │
│  └─ Call normalizeArea() on area input                  │
│                                                           │
│  RESULT: Unified Data Storage                           │
│  ├─ CSV inputs → normalized → stable keys               │
│  ├─ Form inputs → stable keys (already)                 │
│  └─ Both feed same translation system → Consistency!    │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

