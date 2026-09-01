# Google Sheets sync setup

The system sends one row for each sport registration to `SPREADSHEET_WEBHOOK_URL`.

For the provided school spreadsheet, create a Google Apps Script attached to that sheet:

```javascript
const SHEET_NAME = "Sheet1";

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([

      "SPORT EVENT","CATEGORY","SPORTS HOUSE","TEACHER","SESSION","CREATED AT"
    ]);
  }

  sheet.appendRow([
    data.registrationId || "",
    data.studentName || "",

    data.className || "",
    data.event || "",
    data.category || "",
    data.house || "",
    data.teacher || "",
    data.session || "",
    data.createdAt || ""
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Deploy as Web App and put the Web App URL into Vercel:
`SPREADSHEET_WEBHOOK_URL`

Because the backend sends one row per sport, a student with two sports will appear in two spreadsheet rows:
one row for Event A and one row for Event B.
