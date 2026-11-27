# Change log

Every change Codify makes to this workspace is recorded here, newest first, before it is published.
Since app 0.18.0 the Publish button writes a full commit message too (a subject, "Why:" and "What changed:"),
using these entries and the Codify requests behind them. This file stays the longer, readable history.

Format: date · area · short title, then what changed, why, files, and the commit once published.

---

## 2026-11-27 · skill, job, ui · Retail tab renamed "Today's News"; every news lane required
- **What:** The Retail tab is now "Today's News", its button "Run news scan", and the news digest is the first view (Retail market second).
  The digest rules now require at least 3 items in every lane (aim 4 or 5), working lane by lane; Top 3 stories stay in their lane's list
  and the screen shows them once. Each lane has a checked list of RSS feeds (retail, tech and security, data and ML, AI, design) to read first,
  then Google News search to find second outlets. Items may be confirmed by two outlets, one primary source (company post, paper, filing),
  or the publishing outlet for analysis pieces. Links must go to the article itself, not a Google News redirect, and paragraphs must come
  from reading the article.
- **Why:** The first digest had Retail 3 (all moved to Top 3, so the lane looked empty), Tech 1, Data 1, AI 5 and Design 0. Design and data
  news is often announced by one company or research group, so the two-outlet rule dropped it, and many links went to news search
  pages the scan could not open.
- **Files:** skills/retail-scan/SKILL.md, jobs/retail.md, ui/screens/retail.json, ui/RetailPanel.tsx, ui/RetailDigest.tsx, CHANGELOG.md
- **Commit:** _not yet published_

## 2026-11-27 · skill, job, ui · Retail scan adds a 3-day, five-lane news digest
- **What:** Each retail scan now also builds a digest of the last 3 days: 15 to 22 stories across five lanes
  (Grocery & Retail, Technology including security, Analytics / Data Science / ML, AI frontier and applications, Design & human-AI experience),
  each with a short headline, a 2 to 4 sentence paragraph and source links. Every story must be confirmed by at least two independent
  outlets and dated inside the window; unverified candidates are listed as "left out". Three "Top 3 for retail" stories carry a specific
  "Retail angle" on what they mean for grocers, retailers and retail stocks. The Retail tab gets a "3-day digest" view next to
  "Retail market", in a tile layout: three stat boxes (stories tracked, top picks, lanes covered), a coloured label per lane, and one
  full-width card per story, with lane filters. Adapted from a personal digest brief, with personal names, the employer, the email
  delivery and the search-only workaround removed. Also removed an employer name from the retail-scan private-grocer list.
- **Why:** The user wanted the retail scan to cover these lanes in one place, safe for a public repository.
- **Files:** skills/retail-scan/SKILL.md, jobs/retail.md, ui/RetailDigest.tsx (new), ui/RetailPanel.tsx, CHANGELOG.md
- **Commit:** c15ec58

## 2026-11-25 · skill, job, ui · New Retail tab with its own retail scan
- **What:** New "Retail" tab, after Market Scan, with a "Run retail scan" button. Its panel shows:
  a retail mood and summary; seven segment cards (Grocery, Big box & clubs, Discount & dollar, Consumer staples, Home improvement,
  Online & department, Sector funds) with live prices and average day change; click a card to filter the news; retail alerts;
  retail news tagged by segment and good/bad impact; what the news means for the user's own retail stocks; upcoming earnings and
  data dates; shopper and price data (retail sales, food inflation, sentiment); trends moving retail; and ideas worth a closer look.
  Any ticker opens the stock detail window. New retail-scan skill (segments, tickers, sources such as CNBC retail, Grocery Dive,
  Retail Dive, Supermarket News; private grocers like Aldi and Publix covered through their effect on listed names) and new retail job that saves "retail".
  Tab order is now Preferences, Market Scan, Retail, Candidates, Recommendations, Performance.
- **Why:** The user wanted one place for the important retail news across grocery, big box, consumer staples and related segments.
- **Files:** skills/retail-scan/SKILL.md (new), jobs/retail.md (new), ui/screens/retail.json (new), ui/RetailPanel.tsx (new), ui/lib/retail.ts (new),
  ui/screens/candidates.json, ui/screens/recommendations.json, ui/screens/review.json (tab order), CHANGELOG.md
- **Commit:** 8e2f765

## 2026-11-25 · ui · Performance: two clear rows, "App picks" and "My funds"
- **What:** Replaced the mixed summary cards and the separate Total dividends box with two labelled rows of seven cards.
  App picks: Value, Cash, Invested, Unrealized, Realized + dividends (with trades sold and win rate), Dividends + interest, Total profit vs goal (with progress bar).
  My funds: Value, Cost, Unrealized, Realized + dividends, Dividends + interest, Est. income / year (with yield), Total return (price + dividends).
  The header keeps the combined account value and today's change. No numbers mix the two groups except that header total.
- **Why:** The user found the cards confusing because app-pick and own-fund numbers were blended across many boxes.
- **Files:** ui/Portfolio.tsx, CHANGELOG.md
- **Commit:** 06ca6cf

## 2026-11-25 · ui, skill · Performance: total dividends at the top and "Realized + dividends" card
- **What:** The Performance header shows a "Total dividends" box (dividends and interest actually paid on the app's calls plus
  your own funds, split into the two, with any pending amount noted) and adds "+$X dividends" to the today / all-time line.
  A new "Realized + dividends" card sits next to Realized profit: closed-trade profit plus all dividends paid.
  The performance-review skill now reads payment dates from stockanalysis.com dividend pages first (Nasdaq returned none for the
  user's ETFs, so every payout was left "pending" and all dividend totals showed $0).
- **Why:** The user wanted total dividends visible at the top and realized profit shown with dividends.
- **Files:** ui/Portfolio.tsx, skills/performance-review/SKILL.md, CHANGELOG.md
- **Commit:** 0880801

## 2026-11-25 · ui, job · Candidates: what each company does and its competitors
- **What:** The stock detail window (opened by clicking a ticker on Candidates, Recommendations or Today) has a new
  "About the company" box at the top: a plain-English summary (saved by the evaluation), the full company description,
  industry, sector, founded, employees, CEO and website (read live from stockanalysis.com), a competitor list with how each
  competes (saved by the evaluation), and listed companies in the same industry closest in size (live). Clicking any of those
  tickers opens it in the same window, with a Back button. The Candidates table shows each ranked stock's industry and a short
  "what they do" line under its name. The evaluate job now saves `business`, `industry` and `competitors` for each ranked stock.
- **Why:** The user couldn't tell from the names what the companies do or who they compete with.
- **Files:** ui/lib/companyProfile.ts (new), ui/CompanyAbout.tsx (new), ui/RecommendationsPanel.tsx, ui/CandidatesPanel.tsx, jobs/evaluate.md, CHANGELOG.md
- **Commit:** 09f50a4

## 2026-11-25 · ui, skill, job · Fix: Market Scan box stuck on the Nov 22 scan
- **What:** The Market Scan box on the Today screen now reads the latest saved scan (what "Run market scan" saves), so it updates on
  every run: mood, index and risk metrics, alerts (bad/warn/info shown as high/medium/low), news likely to move the market, and
  leading/lagging sectors. The box shows a "Stale" flag when the scan is over a day old. Removed the outdated "No recommendations yet" and
  version lines. The market-scan skill no longer asks the runtime agent to rewrite a screen file; the scan job now also saves the scan time.
- **Why:** The box read a fixed snapshot built into the screen. The skill told the runtime agent to overwrite that file after each scan,
  but that agent may write only inside records/, so the box never changed after Nov 22 even though scans ran.
- **Files:** ui/Today.tsx, ui/MarketScanPanel.tsx, skills/market-scan/SKILL.md, jobs/scan.md, CHANGELOG.md
- **Commit:** 1cc42ba

## 2026-11-25 · ui · Fix: could not save an edited holding
- **What:** The Edit form for a holding you added was drawn inside the wide Positions table, so its Save changes and Cancel
  buttons sat off-screen to the right (only reachable by scrolling the table sideways). The form now opens at the top of
  the Positions box, at full width, with a title naming the holding; Save changes and Cancel sit right after the fields and
  the fields wrap on narrow windows. The row being edited is highlighted with "Editing above", and Edit / Add date scroll the form into view.
- **Why:** The user filled in "Bought on" for OMAH and could not find a way to save it.
- **Files:** ui/Portfolio.tsx, ui/HoldingForm.tsx, CHANGELOG.md
- **Commit:** 50c17b6

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
