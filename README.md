# Compliance Dashboard

A Next.js dashboard that reads from Google Sheets via Apps Script and displays compliance metrics, breach highlights, and charts — deployable on Vercel.

---

## 1 · Set Up the Apps Script

1. Open your Google Sheet → **Extensions → Apps Script**
2. Paste the contents of `AppScript.gs` into the editor (replace any existing code)
3. Change `SHEET_NAME` at the top if your tab is not called `Sheet1`
4. Click **Deploy → New deployment**
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the **Web App URL** (looks like `https://script.google.com/macros/s/ABC.../exec`)

---

## 2 · Configure the Dashboard

Open `vercel.json` and replace `YOUR_DEPLOYMENT_ID` in the URL with the deployment ID from step 1.

Or create a `.env.local` file in the project root:

```
NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

---

## 3 · Run Locally

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## 4 · Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new).

In Vercel project settings → **Environment Variables**, add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_APPS_SCRIPT_URL` | your Apps Script Web App URL |

---

## Sheet Format Expected

| Column | A | B | C | D | E | F | G | H |
|--------|---|---|---|---|---|---|---|---|
| | id | Date | Area Type | Type (status) | Type (tag) | Checklist Title | Checked Status | Remarks |

- Rows without an `id` inherit the id/date/area from the row above (merged-cell style)
- `Checked Status`: `Yes` = OK, `No` = Breach

---

## Features

- **Date filters**: Today / Yesterday / Last 7 Days / All Time / Custom range
- **Area Type filter**: Dynamic dropdown from your sheet data
- **Checked Status filter**: All / OK / Breach
- **KPI cards**: Compliance %, Total Checks, Passed, Breaches
- **Bar chart**: Compliance % per Area Type (green ≥80%, amber 50–79%, red <50%)
- **Critical Breach table**: All `No` rows highlighted with remarks
- **Full checklist table**: All filtered rows with status badges
