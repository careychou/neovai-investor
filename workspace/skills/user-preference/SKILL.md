---
description: How this user wants to invest, including trading style, hard limits and what to avoid.
order: 1
---
# User preference

Read this before any other skill. Every later step (scan, evaluation, recommendation, review) must stay inside these rules. If any other skill or job says something looser, these rules win.

## Settings in goals.json

Read `goals.json` each time. You cannot edit it; the user changes it on the Preferences screen. It may hold more fields than the three below; follow every one.

- `earningCapPct`: take the gain when a position is up this much.
- `lossLimitPct`: the largest loss allowed on a position.
- `budget`: the total money available.
- `overallProfitPct`: the overall profit goal, as a % of the whole budget (default 10 if missing).
- `maxPerStockUsd`: the most money in any one stock, per buy and for the whole position (default 1000 if missing).

Below, "the goal" means `overallProfitPct` % of the budget and "the per-stock cap" means `maxPerStockUsd`. The dollar figures in brackets are examples at the default settings; always work from the saved values.

**Stricter wins.** If `goals.json` and the rules below differ, use the stricter value: the smaller loss limit, the smaller budget and the smaller position size. The 20% must-sell rule always applies to trades, even when `earningCapPct` is higher. For the long bucket, the 2% stop and the 20% sale are replaced by rules 28 and 31; there, `lossLimitPct` caps the stop. If `earningCapPct` is lower than 20, take profit there. If the values differ, say so once in the report, for example "Your saved loss limit is 7%; the stricter 2% rule applies." Never tell the user to change anything in Settings.

## The user's rules (set by the user, 2026-11-22)

1. **Overall profit goal: `overallProfitPct` on the whole budget** (10% = $1,000 on $10,000). This counts realized plus unrealized profit on all positions since 2026-11-22.
2. **Budget: $10,000.** The total in open positions plus new buys may never be more than this.
3. **Max per stock: `maxPerStockUsd`** ($1,000 by default). A single purchase, and the whole position in one ticker, is capped at this amount at the entry price. Never add to a ticker past it.
4. **Loss exit: 1 to 2%, hard stop at 2%.**
   - Every buy sets its stop no more than 2% below the entry. That is a $20 loss at most on a $1,000 position.
   - Soft exit at -1%: sell all if the position is down 1% or more and the reason for buying has weakened (it broke the setup level, the news turned, or momentum faded).
   - Hard stop at -2%: sell all, no exceptions, no waiting for a bounce.
5. **Must sell above +20%.** When a position's gain is more than 20%, sell all of it.
6. **Day trading is allowed.** Buying and selling the same day is fine and is the preferred style.

## Three buckets (added 2026-11-24)

This is retirement money. The user will take some risk, but not an all-in bet. Split the budget three ways and label every call with its bucket:

| Bucket | Share of budget | Default at $10,000 | What it is for |
|---|---|---|---|
| `long` | 40% | $4,000 | Under-followed quality companies ("hidden jewels") held for months to years. Rules 26 to 33. |
| `trade` | 40% | $4,000 | Short-term trades and hedges for quick gains. Rules 4 to 17. |
| `income` | 20% (or more when idle) | $2,000 | T-bill funds earning interest. Rules 20 to 25. |

A bucket may run under its share; idle long or trade money may sit in the income sleeve. A bucket may never go over its share at the entry price. Rules 1 to 3, 18 and 19 apply to every bucket.

**Hype goes in `trade` only.** A stock is hype when RSI(14) is above 75, short interest is above 15% of the float, or it jumped on a news spike or social-media buzz. A hype name is allowed only as a trade with a clear exit inside one to two days, a 2% stop, and enough volume to get out at once. Never put a hype name in `long`.

## Added rules for the trade bucket

These were added on 2026-11-22 to fit the user's trading style and apply to the `trade` bucket. The user can change them in Codify.

7. **Max 5 open positions** at a time. At the per-stock cap each, at most 5 × the cap is invested ($5,000 by default) and at least half the budget stays out of trades. That money does not have to sit idle: it can earn interest in the income sleeve (rules 20 to 25).
8. **Max 5 new buys per day.** Once a day has 5 buys, make no more buy calls until the next session.
9. **Daily loss limit: 2% of budget ($200).** Count realized and unrealized losses across all positions for the day. If the day is down $200, make no new buys for the rest of the day, and recommend selling every losing position or moving its stop to the current price.
10. **Weekly loss limit: 5% of budget ($500).** If the last 5 sessions lose $500 or more, pause new buys until the user runs a performance review and agrees to continue.
11. **Take partial profit.**
    - At +3%: sell half and move the stop on the rest to the entry price (breakeven).
    - At +6%: raise the stop on the rest to +3%.
    - Above that: trail the stop 3% below the highest price since entry. Above +20%, sell all (rule 5).
12. **No new buys in the first 15 minutes (9:30 to 9:45 ET) or the last 15 minutes (after 3:45 PM ET).** Sells and stop changes are allowed at any time.
13. **Review each day trade before the close.** Recommend closing a same-day position before 4:00 PM ET unless it is green with its stop at breakeven or better and has no earnings or major news overnight.
14. **Never hold through earnings.** Sell before the report.
15. **Never average down.** Do not add to a position that is losing.
16. **Liquid names only:** US stocks and ETFs priced at $5 or more, with an average daily volume of at least 1,000,000 shares, and a tight spread.
17. **Reward to risk of at least 1.5.** With a 2% stop, the first target is at least +3%.
18. **Protect the goal.** When total profit reaches the goal (10% = $1,000 by default), say so in every report. From then on, cut new position size to half the per-stock cap. If total profit drops back below 80% of the goal (8% = $800 by default), make no new buys that day.
19. **Cash account, no margin.** Buy only with settled cash and do not use margin. Because the account has no margin, the pattern day trader rule does not apply. Say so if the user mentions margin.

## Long-term bucket: hidden jewels (added 2026-11-24)

26. **What qualifies.** Profitable small and mid caps ($300M to $20B market cap) that few analysts follow (8 or fewer is a plus), with quality and a fair price. Look for most of: return on invested capital 12% or more, free-cash-flow yield 4% or more, PEG under 1.5, debt under 3× EBITDA, Piotroski F-score 6 or more, sales growing, insiders buying or holding. Large caps qualify only when they trade at a clear discount to their own history. Price at $5 or more and average volume at least 300,000 shares. No hype names (see Three buckets).
27. **Entry.** Buy only when price is above its 200-day average, or within 10% of a 52-week low with insiders buying and the thesis intact. Write a one-line thesis: why the market is missing it and what would prove it wrong.
28. **Stop.** 8 to 10% below the entry, or a weekly close under the 200-day average, whichever comes first. Rule 4's 2% stop does not apply to `long`. Never set a long stop wider than 10%, or wider than `lossLimitPct` when that is smaller (stricter wins).
29. **Size.** Up to 1.5 × the per-stock cap per long position ($1,500 by default), and the whole `long` bucket under 40% of the budget. Buy in two parts: half now, half after the first confirming quarter or a pullback that holds the 200-day average.
30. **Earnings.** A long position may hold through earnings when the thesis is intact (rule 14 is for trades). Exit if the report breaks the thesis: guidance cut, margins falling two quarters in a row, or the stop is hit.
31. **Profit.** No forced sale at +20% for `long` (rule 5 is for trades). At +30%, sell a third and trail the rest 15% below the highest close. Re-check the thesis at +50%.
32. **Count.** Up to 4 long positions, counted separately from rule 7's 5 trade positions. Rule 8's 5 buys a day counts all buys.
33. **Review.** Check every long position once a week and after each earnings report: thesis still true, stop not hit, still under the size cap. Never average down after a fall of more than 5% (rule 15 still applies).

## Income sleeve: interest from Treasury bills (added 2026-11-23)

The user wants steady interest income from Treasuries and similar short-term fixed income, as a good option alongside trading. A stock or ETF that pays no dividend earns nothing while it is held, and idle cash earns nothing either. Short-term Treasury bill funds pay interest every month with very little price movement. In late 2026, T-bill yields are rising: the 13-week bill was about 4.1%, up from about 3.5% earlier in the year.

20. **What qualifies.** Only ultra-short US Treasury funds: SGOV (0–3 month T-bills), BIL (1–3 month T-bills), USFR (floating-rate Treasuries, whose interest resets as rates rise) and SHV (short Treasuries). These are the income sleeve. Longer bond funds such as TLT or IEF are not income-sleeve holdings: their prices fall when rates rise, so treat them as normal trades under every rule above. No corporate, high-yield or leveraged bond funds.
21. **Where the money comes from.** Only the cash not needed for trading. Keep enough settled cash to fund today's possible buys (up to 5 × the per-stock cap, $5,000 by default). Anything above that may go into the sleeve. The budget rule still holds: trading positions + sleeve + new buys ≤ budget. Because the account is cash only (rule 19), a sleeve sale settles the next business day. Plan one day ahead when trading cash is needed. Never use unsettled sleeve proceeds.
22. **Which trading rules apply.** The sleeve is a place to park cash, not a trade. These rules do not apply to it: max 5 positions (7), max 5 buys a day (8), the per-stock cap (3), partial profit (11), closing before the bell (13) and the 1.5 reward-to-risk rule (17). These rules still apply: the budget (2), the 2% hard stop from the entry price (4), never averaging down after a 2% drop (15), and liquidity (16). All four sleeve funds meet the liquidity rule easily. At most one buy and one sell per fund per day: no day trading the sleeve.
23. **When to recommend it.** Recommend a sleeve buy when settled cash above the trading reserve is more than $500 and is expected to stay idle for at least a few days. On weak market days (rule 9 or 10 hit, or the scan shows high risk), favor moving idle cash into the sleeve over the inverse-ETF hedge. When the sleeve must fund new trades, recommend a partial sleeve sale a day ahead.
24. **Interest as a benchmark.** A trade held overnight or longer should have an expected gain clearly above what the same money would earn in the sleeve over the same time. Mention this in the reason when a swing trade's target is small.
25. **Reporting.** In every report that covers the account, show the current 13-week T-bill yield (Yahoo symbol ^IRX, the price is the yield in %) and its trend over the last 3 months, the money in the sleeve, and the estimated interest: sleeve value × yield ÷ 12 per month. If the yield cannot be fetched, say "no data". Never guess a yield. Sleeve interest counts toward the overall profit goal (rule 1), shown as its own line, apart from trading profit.

## Style

- A balance for retirement: some risk, never all in. Three buckets (long, trade, income), 40/40/20.
- Long: under-followed quality bought at a fair price and held for months to years. Ignore the crowd; follow the business.
- Trade: intraday to a few days. Small, repeatable gains of 1 to 3 percent. Hype only here, with a quick exit.
- Buy and sell in parts instead of all at once.
- Hedge weak days: park more money in the income sleeve (T-bill funds), or take a small inverse index ETF position in the trade bucket that is within the per-stock cap and uses the same stop rules.
- Watch the account's risk numbers from the performance review (beta, max drawdown, Sharpe). If beta is above 1.3 or the drawdown is worse than -10%, shrink the trade bucket and favor long quality and income.
- No options, no margin, no penny stocks.

## Quick check for every call

Every call names its bucket: `long`, `trade` or `income`. Check the bucket stays under its share of the budget.

Before saving a trade buy, confirm: the position is at or under the per-stock cap (or half of it after the goal is reached), the stop is 2% or less below the entry, reward to risk is 1.5 or more, there are 5 or fewer open positions including this one, there are 5 or fewer buys today, the daily and weekly loss limits are not hit, the time is not inside the opening or closing 15 minutes, there are no earnings while you hold, and the name is liquid. Drop any call that fails a check and say which rule it broke.

For a long buy, check this instead: it meets rule 26 and is not hype, it has a thesis (rule 27), the stop is 8 to 10% below the entry (rule 28), the position is at or under 1.5 × the per-stock cap and the long bucket stays under 40% (rule 29), there are 4 or fewer long positions (rule 32), and there are 5 or fewer buys today.

For an income-sleeve buy, check this instead: the fund is on the rule 20 list, enough settled cash stays back for trading (rule 21), trading positions + sleeve ≤ budget, and it is the only sleeve buy in that fund today. Label sleeve calls "Income" in the reason so they are not mistaken for trades.

## Learned from decisions

`records/data/decisions.json` lists the calls the user accepted or declined. The app writes it; it is read-only to you. Before recommending, read it and lean toward the kinds of calls the user takes. Do not repeat a call the user declined in the last five days unless something material changed, and say what changed.

`records/data/holdings.json` lists stocks and funds the user bought outside the app, with their own money. Also read-only to you. They tell you what the user likes to own; they do not use the budget or the per-stock cap.

## When the user states a new preference

- Runtime jobs: do not edit this file. Report the new preference so the user can add it in Codify.
- If a new preference conflicts with a rule above, the stricter rule wins. Say so.
