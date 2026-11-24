# Change log

Every change Codify makes to this workspace is recorded here, newest first, before it is published.
The commit message the Publish button writes only names the folders changed ("Codify: update ui (2 files)");
this file says what changed, why, and what the user sees. Match an entry to a commit by date and file list.

Format: date · area · short title, then what changed, why, files, and the commit once published.

---

## 2026-11-24 · tooling · Add this change log
- **What:** Added this file so each commit has a readable explanation of its change.
- **Why:** The automatic commit message is not informative enough for audits; the user asked for more detail.
- **Files:** CHANGELOG.md
- **Commit:** _not yet published_

## 2026-11-24 · ui · Performance: "How these numbers add up" section
- **What:** New collapsible section on the Performance screen that shows the arithmetic behind Realized profit,
  Unrealized profit, Total profit, Cash and Total value, line by line from each trade and holding, with a
  plain-English summary and a warning if any saved card does not equal the sum of its parts.
- **Why:** The user saw mostly losses and could not tell how the account was up $3.24 overall
  (USFR, shown only in the Income section, was counted in the cards but not in the Positions table).
- **Files:** ui/ShowTheMath.tsx (new), ui/screens/review.json
- **Commit:** e15809f

## 2026-11-24 · ui · All tabs use the full window width
- **What:** Removed the app's fixed ~1,100px page width so every tab grows and shrinks with the window.
- **Why:** Wide tables (Candidates) were cut off while the window had empty space on the right.
- **Files:** ui/fullWidth.css (new); loaded from ui/CandidatesPanel.tsx, ui/PreferencesForm.tsx,
  ui/RecommendationsPanel.tsx, ui/Portfolio.tsx, ui/Today.tsx
- **Commit:** 8d40021
