# CSV i18n Fix - Testing Guide

## Quick Test: Verify the Fix Works

### Test Setup
1. Open `/ui-2` folder in terminal
2. Run `npm run dev` to start the dev server
3. Open the User Management page in browser
4. Have language toggle ready (English ↔ Japanese)

---

## Test Case 1: CSV with Display Labels ✅

### CSV File Content
Save this as `test-labels.csv`:
```csv
first name,last name,employee id,user job role,area of work,role,password
Alice,Johnson,EMP101,AI Engineer,Ayase,user,password123
Bob,Williams,EMP102,System Engineer,Ebina,admin,password456
Charlie,Brown,EMP103,IT Manager,Akihabara Main Building,user,password789
```

### Test Steps
1. Click "Upload CSV" button
2. Select `test-labels.csv`
3. **Expected Result:** Table shows:
   - Alice: Job Role = "AI Engineer", Area = "Ayase"
   - Bob: Job Role = "System Engineer", Area = "Ebina"
   - Charlie: Job Role = "IT Manager", Area = "Akihabara Main Building"

### Language Toggle Test
1. Switch to Japanese
2. **Expected Result:** Values instantly translate:
   - Alice: Job Role = "AIエンジニア", Area = "綾瀬"
   - Bob: Job Role = "システムエンジニア", Area = "海老名"
   - Charlie: Job Role = "ITマネージャー", Area = "秋葉原本館"
3. Switch back to English - should restore English labels

✅ **If all labels translate correctly → Fix is working!**

---

## Test Case 2: CSV with Stable Keys ✅

### CSV File Content
Save this as `test-keys.csv`:
```csv
first name,last name,employee id,user job role,area of work,role,password
Diana,Garcia,EMP201,system_engineer,hiratsuka,user,password111
Eve,Martinez,EMP202,tester,akihabara_daidoh,admin,password222
Frank,Lopez,EMP203,sales_manager,ayase,user,password333
```

### Test Steps
1. Click "Upload CSV" button
2. Select `test-keys.csv`
3. **Expected Result:** Table shows (same as Test Case 1 format):
   - Diana: Job Role = "System Engineer", Area = "Hiratsuka"
   - Eve: Job Role = "Tester", Area = "Akihabara Daidoh Building"
   - Frank: Job Role = "Sales Manager", Area = "Ayase"

### Language Toggle Test
1. Switch to Japanese
2. **Expected Result:** Values instantly translate correctly

✅ **If translations match Test Case 1 → Fix handles both formats!**

---

## Test Case 3: Mix of Uppercase/Lowercase ✅

### CSV File Content
Save this as `test-mixed-case.csv`:
```csv
first name,last name,employee id,user job role,area of work,role,password
Grace,Taylor,EMP301,AI ENGINEER,AYASE,user,password444
Henry,Anderson,EMP302,system_engineer,EBINA,admin,password555
Isabella,Thomas,EMP303,IT Manager,akihabara_main,user,password666
```

### Test Steps
1. Click "Upload CSV" button
2. Select `test-mixed-case.csv`
3. **Expected Result:** All entries display correctly:
   - Grace: Job Role = "AI Engineer", Area = "Ayase"
   - Henry: Job Role = "System Engineer", Area = "Ebina"
   - Isabella: Job Role = "IT Manager", Area = "Akihabara Main Building"

### Language Toggle Test
1. Switch to Japanese
2. **Expected Result:** Values translate correctly (same as previous tests)

✅ **If case-insensitive matching works → Fix is robust!**

---

## Test Case 4: Empty/Invalid Values ✅

### CSV File Content
Save this as `test-edge-cases.csv`:
```csv
first name,last name,employee id,user job role,area of work,role,password
Jack,White,EMP401,,Ayase,user,password777
Karen,Harris,,IT Manager,,user,password888
```

### Test Steps
1. Click "Upload CSV" button
2. Select `test-edge-cases.csv`
3. **Expected Result:**
   - Jack row: Job Role is empty, Area = "Ayase"
   - Karen row: Job Role = "IT Manager", Area is empty (if allowed)

✅ **If empty values don't crash → Fix handles edge cases!**

---

## Test Case 5: Consistency with UI Form

### Step 1: Add user via form
1. Click "Add User" button
2. Fill in: 
   - First Name: "Leo"
   - Last Name: "King"
   - Employee ID: "EMP999"
   - Job Role: Select "HR" from dropdown
   - Area of Work: Select "Ebina" from dropdown
   - Role: Select "Admin"
   - Password: "testpass"
3. Click Save

### Step 2: Compare with CSV-added users
- Look at form-added user in table: Leo, HR, Ebina, Admin
- Compare with CSV-added users from previous tests

### Test 5A: Toggle Language
1. Switch to Japanese
2. **Expected Result:**
   - Form-added user Leo displays: Job Role = "HR部長" (or similar), Area = "海老名"
   - This should MATCH the behavior of CSV-uploaded users

✅ **If both methods produce identical results → Consistency achieved!**

---

## Test Case 6: Data Persistence

### Setup
1. Upload a CSV with test data
2. Take note of all displayed values
3. Refresh the page (F5)

### Expected Result
- **Note:** If using mock data (localStorage not yet implemented):
  - Data should remain after refresh if component uses state properly
  - If data disappears, check if backend persistence is needed

---

## Success Criteria

✅ **All following must be true:**

1. CSV uploads with display labels ("AI Engineer") display correctly
2. CSV uploads with stable keys ("ai_engineer") display correctly  
3. Case variations ("AI ENGINEER", "ai engineer") are handled
4. Table displays show translated labels in English
5. Language toggle (English ↔ Japanese) instantly updates all CSV-imported user rows
6. Form-added users and CSV-added users display identically
7. No console errors or warnings during CSV import
8. Empty/missing fields don't crash the component

---

## Debugging Tips

### If values show as keys like "user.jobRole.AI Engineer":
1. Check browser console for errors
2. Verify normalization functions exist in code
3. Check that CSV column headers are exact: "user job role", "area of work"

### If language toggle doesn't work:
1. Verify translation keys exist in en.json and ja.json
2. Check that `t()` function is being called correctly
3. Verify useLang context is properly initialized

### If values show raw but correctly:
- This is OK! It means:
  - CSV values are being normalized correctly
  - Table is displaying (not translating)
  - Likely the translation keys are missing, not the normalization

---

## CSV Template Generator

**Quick CSV Template** (copy & paste):
```csv
first name,last name,employee id,user job role,area of work,role,password
John,Doe,EMP001,AI Engineer,Ayase,user,password123
Jane,Smith,EMP002,System Engineer,Ebina,admin,password456
Bob,Johnson,EMP003,IT Manager,Akihabara Main Building,user,password789
```

**Alternative Template** (using stable keys):
```csv
first name,last name,employee id,user job role,area of work,role,password
John,Doe,EMP001,ai_engineer,ayase,user,password123
Jane,Smith,EMP002,system_engineer,ebina,admin,password456
Bob,Johnson,EMP003,it_manager,akihabara_main,user,password789
```

---

## Regression Testing

After fix is applied, verify these still work:

- [ ] Adding user via form works
- [ ] Editing user still works
- [ ] Deleting user still works
- [ ] Password visibility toggle works
- [ ] No new TypeScript/ESLint errors
- [ ] Component renders without crashes
- [ ] Mobile responsive (if applicable)

---

## Performance Check

- [ ] CSV with 100 rows uploads quickly
- [ ] No lag when toggling language
- [ ] No memory leaks (check DevTools)
- [ ] Component doesn't re-render excessively

---

## Acceptance Criteria

The fix is **complete and successful** when:

```
CSV Upload Test Cases (1-3): ✅ ALL PASS
Case Sensitivity Test (4): ✅ PASS
Consistency Test (5): ✅ PASS
Language Toggle: ✅ Works instantly for CSV data
No Errors: ✅ Zero console errors
```

