# Google Sheets Setup Instructions

To sync your read progress with a Google Sheet, follow these steps:

## 1. Prepare your Google Sheet
1. Open your Google Sheet with the reading list.
2. Ensure your columns are: **Read**, **Phase**, **Title**, **Format**.
3. (Optional but recommended) Ensure the "Title" column has unique names that match the app exactly.

## 2. Create the Google Apps Script
1. In your Google Sheet, go to **Extensions** > **Apps Script**.
2. Replace the existing code with the following script:

```javascript
/**
 * Star Wars High Republic Reading Tracker - Sync Script
 * 
 * This script handles GET (reading data from sheet) and POST (updating sheet from app).
 */

const SHEET_NAME = "Sean's High Republic Reading List"; // Updated to match your specific sheet name

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  // Skip header row
  const headers = data[0];
  const rows = data.slice(1);
  
  const result = rows.map(row => {
    return {
      read: row[0],
      phase: row[1],
      title: row[2],
      format: row[3]
    };
  });
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    console.error("SHEET NOT FOUND: " + SHEET_NAME);
    return ContentService.createTextOutput("Error: Sheet not found").setMimeType(ContentService.MimeType.TEXT);
  }

  try {
    const body = JSON.parse(e.postData.contents);
    const updateMap = {};
    body.forEach(item => {
      updateMap[item.title.toString().trim().toLowerCase()] = item.read;
    });
    
    const values = sheet.getDataRange().getValues();
    
    for (let i = 1; i < values.length; i++) {
      const sheetTitle = values[i][2];
      if (sheetTitle) {
        const cleanTitle = sheetTitle.toString().trim().toLowerCase();
        if (updateMap.hasOwnProperty(cleanTitle)) {
           sheet.getRange(i + 1, 1).setValue(updateMap[cleanTitle]);
        }
      }
    }
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}
```

## 3. Authorize and Deploy the Script
1. **Critical:** Click the **Run** button (play icon) in the Apps Script editor for the `doGet` function once. This will trigger a prompt to **Review Permissions**. Follow the prompts to authorize the script to access your Spreadsheets (you may need to click 'Advanced' > 'Go to [Script Name] (unsafe)').
2. Once authorized, click **Deploy** > **New Deployment**.
2. Select **Web App**.
3. **Execute as:** Me.
4. **Who has access:** Anyone (This is necessary for the app to talk to it without complex OAuth).
5. Click **Deploy**.
6. Copy the **Web App URL**.

## 4. Configure the Web App
1. Go to the **Settings** (Gear icon) in AI Studio.
2. Find the **Secrets** or **Environment Variables** panel.
3. Add a new variable:
   - **Key:** `VITE_GOOGLE_SCRIPT_URL`
   - **Value:** Paste the Web App URL from step 3.
4. Refresh the app. You can now use the **Sync Sheet** button!

## 5. Troubleshooting: What should happen?
- When you check a box in the app, the **"Read"** column (**Column A**) in your sheet should change to `TRUE`.
- If it doesn't: 
  1. Ensure Column A exists and is empty or has TRUE/FALSE already.
  2. Ensure Column C contains the **Titles** of the books.
  3. Ensure you have authorized the script by clicking the **Run** button once in the editor.
  4. Make sure your tab name is exactly: `Sean's High Republic Reading List`.
  5. Make sure you are using the **Web App URL** from the Deployment window, not the URL from your web browser tab.

---
*Note: Due to 'no-cors' mode, the app sends data but cannot strictly verify the response body. If the sync button turns green, the data has been sent to Google.*
