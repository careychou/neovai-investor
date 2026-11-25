# Change log

Every change Codify makes to this workspace is recorded here, newest first, before it is published.
Since app 0.18.0 the Publish button writes a full commit message too (a subject, "Why:" and "What changed:"),
using these entries and the Codify requests behind them. This file stays the longer, readable history.

Format: date · area · short title, then what changed, why, files, and the commit once published.

---

## 2026-11-25 · ui · Fix: could not save an edited holding
- **What:** The Edit form for a holding you added was drawn inside the wide Positions table, so its Save changes and Cancel
  buttons sat off-screen to the right (only reachable by scrolling the table sideways). The form now opens at the top of
  the Positions box, at full width, with a title naming the holding; Save changes and Cancel sit right after the fields and
  the fields wrap on narrow windows. The row being edited is highlighted with "Editing above", and Edit / Add date scroll the form into view.
- **Why:** The user filled in "Bought on" for OMAH and could not find a way to save it.
- **Files:** ui/Portfolio.tsx, ui/HoldingForm.tsx, CHANGELOG.md
- **Commit:** _not yet published_

## 2026-11-25 · skill, job, ui · Count monthly dividends on funds you added (OMAH, JEPI, DIV, SPHD, SPYD)
- **What:** The account review now checks paid dividends on holdings added by hand, lot by lot, over the last 12 months,
  using each lot's "Bought on" date (not the date it was typed into the app). Lots without a buy date get their recent payouts
  listed as "Needs buy date" and not counted. Performance screen: a "Your funds: dividends paid" card, dividends paid and total return
  under each hand-added lot, those payouts in the Dividends & interest table marked "Added by you", the "all time" line includes them,
  and an "Add date" button plus a notice for lots missing a buy date. Also tells the review where to find payment dates when Nasdaq has none.
  These stay outside the app's cash, goal and win rate, like the rest of hand-added holdings.
- **Why:** The user pointed out OMAH and the other funds pay monthly and those payouts were not counted. All six lots were entered without a buy date,
  and the previous rule only covered the app's own calls.
- **Files:** skills/performance-review/SKILL.md, jobs/review.md, ui/Portfolio.tsx, ui/ShowTheMath.tsx, CHANGELOG.md
- **Commit:** 405e8b4

## 2026-11-25 · skill, job, ui · Total profit counts dividends and interest actually paid
- **What:** Total profit is now price change (realized + unrealized) plus dividends and interest **actually paid**.
  A payout counts only if the account held the shares before the ex-date and the payment date has passed.
  Pending and estimated income is listed but never counted. Paid income goes into cash, so
  total value − budget still equals total profit. Stops, loss limits and win rate stay on price only.
  Performance screen: new "Dividends & interest" card and payouts table, total profit split into price + income,
  "How these numbers add up" gains an income step, and the Income section shows interest paid separately from the estimate.
- **Why:** The user wanted total profit to balance price changes against dividends and interest, counting only payouts actually received.
- **Files:** skills/performance-review/SKILL.md, jobs/review.md, ui/Portfolio.tsx, ui/ShowTheMath.tsx, ui/IncomeSleeve.tsx, CHANGELOG.md
- **Commit:** 405e8b4

## 2026-11-24 · tooling · Add this change log
- **What:** Added this file so each commit has a readable explanation of its change.
- **Why:** The automatic commit message is not informative enough for audits; the user asked for more detail.
- **Files:** CHANGELOG.md
- **Commit:** 646719d

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
