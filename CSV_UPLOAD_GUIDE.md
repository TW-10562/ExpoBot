# CSV Upload Template and Usage Guide

## 📋 CSV File Format

The CSV file should have the following header row and structure:

### Header Row (Required)
```
First Name,Last Name,Employee ID,User Job Role,Area of Work,Role,Password
```

### Column Specifications

| Column Name | Required | Data Type | Valid Values | Example |
|---|---|---|---|---|
| First Name | ✅ Yes | String | Any text | John |
| Last Name | ✅ Yes | String | Any text | Doe |
| Employee ID | ❌ Optional | String | Any text | EMP001 |
| User Job Role | ❌ Optional | String | See list below | AI Engineer |
| Area of Work | ❌ Optional | String | See list below | Ayase |
| Role | ❌ Optional | String | "user" or "admin" | user |
| Password | ❌ Optional | String | Any text | SecurePass123 |

---

## 📝 Valid Job Role Options

1. **AI Engineer**
2. **System Engineer**
3. **IT Manager**
4. **TL**
5. **HR**
6. **Sales Manager**
7. **Sales Person**
8. **Tester**
9. **Factory Worker**
10. **Call Center Agent**

---

## 📍 Valid Area of Work Options

1. **Ayase** (綾瀬)
2. **Ebina** (海老名)
3. **Akihabara Main Building** (秋葉原メインビル)
4. **Akihabara Daidoh Building** (秋葉原ダイドウビル)
5. **Hiratsuka** (平塚)

---

## ✅ Example CSV File

```csv
First Name,Last Name,Employee ID,User Job Role,Area of Work,Role,Password
John,Doe,EMP001,AI Engineer,Ayase,user,password123
Jane,Smith,EMP002,System Engineer,Ebina,admin,password456
Robert,Johnson,EMP003,IT Manager,Akihabara Main Building,user,pass789
Sarah,Williams,EMP004,Sales Manager,Hiratsuka,user,salespass
Michael,Brown,EMP005,Tester,Ebina,user,testpass123
```

---

## 📤 How to Upload

1. Click the **"Upload CSV"** button in the User Management header
2. Select a `.csv` file from your computer
3. The file will be parsed automatically
4. New users will appear in the User Management table immediately
5. The upload button will show "Loading..." during processing

---

## ⚠️ Important Notes

### Required Fields
- **First Name** - Must be provided (non-empty)
- **Last Name** - Must be provided (non-empty)

### Optional Fields
- All other fields can be left empty
- Empty cells will result in empty values in the system

### Data Validation
- **Employee ID** - No validation (any text accepted)
- **User Job Role** - Should match one of the 10 valid options
- **Area of Work** - Should match one of the 5 valid areas
- **Role** - Case-insensitive ("admin" or "user"), defaults to "user" if invalid
- **Password** - Any text accepted

### CSV Format Rules
- Comma-separated values (`,`)
- UTF-8 encoding recommended
- Header row must match exactly (case-insensitive)
- Whitespace is trimmed automatically
- Empty rows are skipped
- Files with `.csv` extension only

### Error Handling
- If parsing fails, an error is logged to browser console
- Invalid rows are skipped (but valid ones are still imported)
- Minimum requirement: First Name and Last Name
- If either is missing, the row is skipped

---

## 🔄 Bulk Operation Example

To add 100 new employees:
1. Prepare CSV file with all 100 records
2. Upload the file using "Upload CSV" button
3. All valid records appear in table instantly
4. No need to add users one-by-one

---

## 📊 CSV Upload Flow

```
User clicks "Upload CSV"
        ↓
File picker opens (only .csv files)
        ↓
User selects file
        ↓
FileReader reads file as text
        ↓
Parse CSV:
  - Extract header row
  - Parse each data row
  - Map columns to user fields
  - Validate required fields
        ↓
Create User objects
        ↓
Add to existing users
        ↓
Update table immediately
        ↓
Reset file input
        ↓
Success!
```

---

## 🌍 Multilingual Support

The CSV upload feature works in both languages:

### English
- Button: "Upload CSV"
- Placeholder: "Select Job Role"
- Placeholder: "Select Area of Work"

### 日本語 (Japanese)
- Button: "CSVをアップロード"
- Placeholder: "職務を選択"
- Placeholder: "業務範囲を選択"

---

## 🛠️ Troubleshooting

### Issue: File not uploading
**Solution:** 
- Ensure file extension is `.csv`
- Try using a different CSV editor
- Verify UTF-8 encoding

### Issue: Some rows not appearing
**Solution:**
- Check that First Name and Last Name are provided
- Verify no extra commas in values
- Check for trailing whitespace

### Issue: Wrong job role appearing
**Solution:**
- Use exact spelling from the valid options list
- Check for extra spaces
- Verify Job Role column header is "User Job Role"

### Issue: Password appears empty
**Solution:**
- Password column is optional
- Make sure Password column header is correct
- Check for empty cells in that column

---

## 📁 Files Modified for CSV Upload

- ✅ `ui-2/src/components/UserManagement.tsx` - Main component
- ✅ `ui-2/src/translations/en.json` - English translations
- ✅ `ui-2/src/translations/ja.json` - Japanese translations

## 🔐 Security Note

Currently, CSV upload:
- ✅ Runs entirely on client-side (no server upload)
- ✅ Uses HTML5 FileReader API
- ✅ Data is processed in browser memory only
- ✅ No sensitive data transmitted until final form submission

When integrating with backend:
- Recommend adding server-side validation
- Implement rate limiting for bulk uploads
- Add authentication checks
- Consider password hashing

