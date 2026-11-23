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

**Stricter wins.** If `goals.json` and the rules below differ, use the stricter value: the smaller loss limit, the smaller budget and the smaller position size. The 20% must-sell rule always applies, even when `earningCapPct` is higher. If `earningCapPct` is lower than 20, take profit there. If the values differ, say so once in the report, for example "Your saved loss limit is 7%; the stricter 2% rule applies." Never tell the user to change anything in Settings.

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

## Added rules for short-term day trading

These were added on 2026-11-22 to fit the user's style. The user can change them in Codify.

7. **Max 5 open positions** at a time. At the per-stock cap each, at most 5 × the cap is invested ($5,000 by default) and at least half the budget stays in cash.
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

## Style

- Short term: intraday to a few days at most. Same-day trades are preferred.
- Aim for small, repeatable gains of 1 to 3 percent, not large bets.
- Buy and sell in parts instead of all at once.
- Hedge weak days: hold more cash, or take a small inverse index ETF position that is still within the per-stock cap and uses the same stop rules.
- No options, no margin, no penny stocks.

## Quick check for every call

Before saving a buy, confirm: the position is at or under the per-stock cap (or half of it after the goal is reached), the stop is 2% or less below the entry, reward to risk is 1.5 or more, there are 5 or fewer open positions including this one, there are 5 or fewer buys today, the daily and weekly loss limits are not hit, the time is not inside the opening or closing 15 minutes, there are no earnings while you hold, and the name is liquid. Drop any call that fails a check and say which rule it broke.

## Learned from decisions

`records/data/decisions.json` lists the calls the user accepted or declined. The app writes it; it is read-only to you. Before recommending, read it and lean toward the kinds of calls the user takes. Do not repeat a call the user declined in the last five days unless something material changed, and say what changed.

## When the user states a new preference

- Runtime jobs: do not edit this file. Report the new preference so the user can add it in Codify.
- If a new preference conflicts with a rule above, the stricter rule wins. Say so.
