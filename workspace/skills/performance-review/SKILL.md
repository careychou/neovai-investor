---
description: Check past recommendations against today's prices, keep the account ledger (holdings, closed trades, account summary) and say what to change in the skills.
order: 5
---
# Performance review

Input: `records/data/decisions.json`, `records/data/holdings.json`, every file in `records/`, `goals.json` and today's live prices.

## 1. Build the account ledger from decisions.json

`records/data/decisions.json` is the only source of truth for what the user holds through the app's calls. Only **accepted** calls count. Holdings the user bought elsewhere are in `holdings.json` (section 1b) and never enter this ledger. Declined calls are not trades.

Go through the accepted items in time order (`at`, then `date`):

- **Buy**: opens a lot. Keep: ticker, buy date (`date` of the decision; use `at` if `date` is missing), shares, entry price (`entry` on the call), stop, target, decision `id`.
  - Shares: use `shares` on the decision. If it is missing, use `shares` from the matching call in `records/data/picks.json` or the record file of that date. If that is missing too, use floor(per-stock cap / entry), with the cap from `maxPerStockUsd` in `goals.json`. Never invent a share count when entry is also missing; list the lot with "no data".
  - Adding to a ticker you already hold makes a separate lot. In the holdings, combine lots of one ticker into one row: shares added up, entry = the share-weighted average cost, buy date = the earliest lot.
- **Sell part**: closes the shares on the call (or half the held shares, rounded down, if not given), oldest lot first (FIFO).
- **Sell all**: closes every share of that ticker, oldest lot first.
- **Change**: updates the stop and/or target of the open position. It is not a trade.
- **Exit price** of a sell: the price on the accepted sell call (`entry` or `price` field). If missing, the closing price on the day it was accepted, with source. If neither is known, write "no data" and leave it out of the totals; never guess.
- A position whose price passed its stop or target stays open until the user accepts a sell. Flag it in `watch` and in the summary instead.

Each closed part becomes one closed trade: ticker, buy date, sell date, shares, entry, exit, realized $ = (exit − entry) × shares, realized % = (exit − entry) / entry × 100, days held.

## 1b. Holdings added by hand

`records/data/holdings.json` holds `{items: [{id, ticker, shares, avgCost, buyDate?, name?, kind?, note?}]}`: stocks and funds the user bought outside the app's calls. The app writes it from the Performance screen; it is read-only to you.

- They are the user's positions. Treat each item as one open lot: shares and average cost as given, buy date if given. Never sell, merge or change them; the user edits them on the screen.
- They are extra money, not part of the app's budget. Keep them out of cash, invested, the account totals, the goal, the win rate and the loss limits, so the app's record stays a fair score of its own calls.
- Value each one like a holding in section 3 (price, previous close, market value, cost basis, unrealized and day change, days held when the buy date is known), and add dividends:
  - Trailing 12-month dividend per share: the sum of payouts in the last 365 days. Yahoo's chart answer with `&events=div` (range=1y) lists them under `events.dividends`.
  - Yield = trailing dividend ÷ price × 100. Estimated yearly income = shares × trailing dividend.
  - Next or last ex-dividend date when you can find it.
- Watch line: one line per holding, as in section 3, plus anything that matters for income (a dividend cut, an ex-date this week).
- Save them in `manual` (see the review job) with `source: "manual"` on each row. Add the manual totals: cost basis, market value, unrealized, day change and estimated yearly income.

## 2. Get prices

For every open ticker, including the holdings added by hand, get the current price and the previous close, with source and time. If you cannot get a price, set it to null and write "no data". Never guess a price.

## 3. Compute holdings

For each open ticker:
- market value = shares × current price
- cost basis = shares × entry
- unrealized $ = market value − cost basis; unrealized % = (price − entry) / entry × 100
- day change $ = shares × (price − previous close); if bought today, use shares × (price − entry). Day change % = (price − previous close) / previous close × 100.
- days held = calendar days from the buy date to today (0 on the buy day)
- distance to stop and target in percent, and one line on what to watch next (earnings date, a level, news, or "below stop: sell call due").

## 3b. Dividends and interest paid (only cash actually paid counts)

Total return is price change plus the dividends and interest the account has actually been paid. A payout counts only when both are true:
1. **The account was entitled to it:** the lot was bought before the ex-dividend date and not yet sold on that date. Shares = shares held at the end of the day before the ex-date (after any partial sale before then). This covers closed lots too: a lot sold after its ex-date still keeps that payout.
2. **The cash has arrived:** the payment date is on or before today.

How to find payouts, for every ticker the app's calls have held since 2026-11-22 (trades, long-term holds and the income sleeve):
- Dividend history with ex-dates and payment dates, first choice: `https://stockanalysis.com/etf/<ticker>/dividend/` for funds or `https://stockanalysis.com/stocks/<ticker>/dividend/` for stocks (lowercase ticker). Its table columns are Ex-Dividend Date, Cash Amount, Record Date, Pay Date (worked for OMAH, JEPI, DIV, SPHD, SPYD on 2026-11-25).
- Second choice: `https://api.nasdaq.com/api/quote/<TICKER>/dividends?assetclass=stocks` (use `assetclass=etf` for funds); it returned no rows for these ETFs on 2026-11-25. Fields: `exOrEffDate`, `paymentDate`, `amount`. As a fallback for the ex-date and amount, Yahoo's chart answer with `&events=div` lists them under `events.dividends` (that date is the ex-date, not the payment date).
- If Nasdaq has no payment date, try Yahoo `https://query2.finance.yahoo.com/v10/finance/quoteSummary/<TICKER>?modules=calendarEvents` (`dividendDate` is the latest or next payment date) and the fund issuer's distributions page (most monthly-income ETFs publish ex, record and pay dates). Say which source you used.
- If you cannot find the payment date, or it is after today, list the payout as **pending** with amount and dates, and do **not** count it. Never guess an amount or a date; leave out a payout you cannot confirm and say so in the report.
- Upcoming and estimated income (the sleeve's monthly estimate, a coming dividend) is information only. It never goes into any profit, cash or goal number.

For each counted payout: amount $ = shares entitled × amount per share, rounded to cents. Income $ = sum of counted payouts. **Holdings added by hand** (`records/data/holdings.json`, often monthly-income funds such as OMAH, JEPI, DIV, SPHD): apply the same two tests to **each lot separately** (the same ticker can have several lots with different buy dates). Look back over the last 12 months of payouts.
- Entitlement uses the lot's `buyDate`: it counts for every ex-date after the buy date. `addedAt` is when the user typed it into the app, **not** when they bought it; never use it as a buy date.
- A lot with no `buyDate` cannot be checked: list its recent payouts (the last 3) with `status: "needs buy date"` and do not count them. Say in the summary which holdings need a buy date ("Edit the holding on the Performance screen and fill in Bought on").
- Put these payouts in `dividends.items` with `source: "manual"` and the lot's `holdingId`. Give each manual holding its `dividendsPaidUsd` and `totalReturnUsd` (= unrealized + dividends paid), and fill the `manual` totals `dividendsPaidUsd` and `dividendsPendingUsd`.
- They stay out of every `account`, `goal`, `income`, `cash` and win-rate number, like the rest of `manual`. The Performance screen adds them to the account itself.

Stops, targets, the 2% loss limit, the 20% profit cap and the daily and weekly loss limits stay on **price only**. Income is shown next to them as context but never moves a stop or hides a loss.

## 4. Compute the account summary

Budget = the stricter of `goals.json` budget and the user-preference rule ($10,000).

- invested = sum of cost basis of open holdings
- market value = sum of market value of open holdings (if a price is missing, use cost basis for that holding and say so)
- realized profit = sum of realized $ of all closed trades (price only)
- unrealized profit = sum of unrealized $ of open holdings (price only)
- income = sum of counted payouts from section 3b (paid cash only)
- price profit $ = realized + unrealized
- cash = budget − invested + realized profit + income
- total value = cash + market value
- total profit $ = price profit + income; total profit % = total profit $ / budget × 100
- Per holding and per closed lot, also give the income it has been paid, and total return $ = price change $ + income $.
- goal: `overallProfitPct` (from `goals.json`, default 10) % of budget. Progress = total profit $ / goal $ × 100.
- win rate = closed trades with realized $ > 0 / all closed trades (a trade that breaks even is not a win). Write "n/a" when there are no closed trades.
- today's change $ = sum of day change $ of open holdings + for trades closed today (exit − previous close) × shares. Today's change % = today's change $ / (total value − today's change $) × 100.
- week P&L = the same over the last 5 sessions, for the weekly loss limit.

Round dollars to cents and percents to two decimals. Check: total value − budget must equal total profit $ (realized + unrealized + income).

## 5. Goal progress and limits

Track the user's overall goal from `user-preference`: `overallProfitPct` profit on the whole budget. Say whether it is reached. Give today's and this week's P&L against the daily ($200) and weekly ($500) loss limits, and say plainly if either limit is hit. Flag any holding that breaks a rule: down more than 2%, up more than 20%, or cost basis over the per-stock cap (`maxPerStockUsd`).

## 5b. Income sleeve

Lots in SGOV, BIL, USFR or SHV (or any call marked as a sleeve call) are the income sleeve (user-preference rules 20 to 25). Build them from decisions.json the same way as other lots, but keep them apart:

- List them under the sleeve, not under trading holdings. They do not count as open positions, and their closed parts do not count toward wins, losses or the win rate. They do count in invested, market value, cash, total value and the profit totals.
- Get the 13-week T-bill yield from Yahoo `^IRX` (range=1y, interval=1wk): today, about 3 months ago, and the trend (rising if more than 0.10 points higher than 3 months ago, falling if more than 0.10 lower, else flat). If you cannot fetch it, write "no data" and use null.
- Each fund's yield: its published 30-day SEC yield if you can fetch it, otherwise the T-bill yield, and say which. Estimated monthly interest = market value × yield ÷ 100 ÷ 12. Annual = monthly × 12.
- Interest paid = the sleeve's counted payouts from section 3b (cash actually received). This is the only sleeve interest that counts toward profit.
- Interest accrued so far = sum over sleeve lots of cost basis × yield ÷ 100 × days held ÷ 365, as an estimate of interest not yet paid. Label it as an estimate; it never counts toward profit. These funds pay interest monthly and their price drops slightly on the payout day, so the price change alone understates the return.
- Reserve = 5 × the per-stock cap. Idle cash = cash − reserve (0 if negative). If idle cash is over $500, say in the note that it could earn about idle cash × yield ÷ 100 ÷ 12 per month in the sleeve.
- Flag a sleeve fund that is down 2% from entry (rule 4).

## 6. Score the calls

Read the record files and list each recommendation with its date, action, ticker, entry, target and stop. Mark each one:
- Win: the target was reached before the stop.
- Loss: the stop was reached first.
- Open: neither yet. Give the gain or loss so far in percent.

Score accepted calls as the user's real results, and declined calls separately as what was skipped.

## 6b. Risk metrics against the S&P 500

Measure the account like a fund manager would, so the next recommendation can lean safer or bolder.

1. Fetch daily closes from the Yahoo chart API (`range=6mo` or `1y`, `interval=1d`) for SPY, `^IRX` and every ticker in the account (app positions and holdings added by hand).
2. Build the daily account value from the first accepted decision: cash + app positions × close. Leave out holdings added by hand from returns, as the Performance screen does.
3. From daily returns of the account (p) and SPY (b), with the risk-free rate r = ^IRX / 100 / 252 per day:
   - beta = cov(p, b) / var(b); alpha (yearly, %) = (mean(p − r) − beta × mean(b − r)) × 252 × 100
   - Sharpe = mean(p − r) / stdev(p) × √252; Sortino uses the downside deviation instead of stdev
   - max drawdown = the worst fall from a running peak; volatility = stdev(p) × √252
   - vs S&P 500 = the account's return minus SPY's over the same days
4. With fewer than 20 trading days, still compute them but say they are rough. With fewer than 5, use null.
5. Read them plainly: beta above 1.3 means the account swings more than the market; a drawdown worse than -10% or a Sharpe below 0 means the trade bucket is taking too much risk for retirement money. Say so in the note and in suggested changes.
6. Split results by bucket when there are long positions: return and win rate for `long` and for `trade`.

## 7. What to learn

- What worked: patterns shared by the wins (sector, setup, time of day, market mood).
- What did not: patterns shared by the losses.
- Your choices: how the accepted calls did against the declined ones.
- Suggested changes: name the skill and the exact rule to change, and why. Base each one on at least three recommendations, not on a single result.

Offer the changes to the user. Edit a skill only after the user agrees.

## Save

Add an "Outcome" section to each record file that was reviewed, with the date of the review. Never change the original recommendation text.

If there are no accepted decisions yet, still save the account with zero positions (cash = budget, total value = budget) and say so.
