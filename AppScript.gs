// ============================================================
// Google Apps Script — Compliance Dashboard API
// Deploy as: Extensions > Apps Script > Deploy > Web App
//   Execute as: Me  |  Who has access: Anyone
// ============================================================

const SHEET_NAME = "Sheet1"; // ← change if your tab has a different name

function doGet(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const data = getSheetData();
    output.setContent(JSON.stringify({ success: true, data }));
  } catch (err) {
    output.setContent(JSON.stringify({ success: false, error: err.message }));
  }

  // Allow CORS so the Vercel dashboard can call this endpoint
  return output;
}

function getSheetData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${SHEET_NAME}" not found`);

  const [headers, ...rows] = sheet.getDataRange().getValues();

  // Normalise header names (trim whitespace, lowercase for safety)
  const norm = (s) => String(s).trim();

  const records = [];
  let currentId = null;
  let currentDate = null;
  let currentAreaType = null;
  let currentStatus = null;   // draft / published …
  let currentType = null;     // ruby / …

  for (const row of rows) {
    // A row that has an ID starts a new checklist block
    const maybeId = norm(row[0]);
    if (maybeId && maybeId !== "") {
      currentId       = maybeId;
      currentDate     = norm(row[1]);
      currentAreaType = norm(row[2]);
      currentStatus   = norm(row[3]);
      currentType     = norm(row[4]);
    }

    const checklistTitle = norm(row[5]);
    const checkedStatus  = norm(row[6]).toLowerCase(); // "yes" | "no"
    const remarks        = norm(row[7]);

    if (!checklistTitle) continue; // skip empty rows

    records.push({
      id:            currentId,
      date:          currentDate,
      areaType:      currentAreaType,
      status:        currentStatus,
      type:          currentType,
      checklistTitle,
      checkedStatus,  // "yes" = OK, "no" = NOT OK
      remarks,
    });
  }

  return records;
}
