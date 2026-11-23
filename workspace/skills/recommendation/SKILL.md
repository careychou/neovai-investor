---
description: Turn the ranked candidates and open positions into buy, sell part, sell all or hold calls.
order: 4
---
# Recommendation

Input: the ranked table from `candidate-evaluation` (`records/data/candidates.json` when saved), the open positions, and the limits from `user-preference`.

Open positions are the Buy calls the user accepted in `records/data/decisions.json` and has not closed with an accepted Sell all, plus those in `records/data/review.json`. A call the user did not accept is not a position.

## Open positions first

For each position the user still holds, pick one:

- Sell all: the 2% hard stop was hit; the position is down 1% or more and the reason for buying has weakened; the gain is above 20% (or at `earningCapPct`, if that is lower); earnings come before the next session; or the daily loss limit was hit and the position is losing.
- Sell part: the gain is +3% or more and no part has been sold yet. Sell half and move the stop to the entry price (rule 11 in `user-preference`).
- Day trade check: near the close, follow rule 13 in `user-preference` for positions opened today.
- Change: keep the position but adjust it, for example raise the stop after a gain, lower the target when momentum fades, or add to it within the limits. Say what changes and why.
- Hold: none of the above. Give the current gain or loss.

## How many calls

- Every open position gets a call (Sell, Change or Hold).
- New buys are capped by `user-preference`: no more than 5 open positions in total, including the new buys, and no more than 5 buys per day. Count the buys already made today in today's `records/YYYY-MM-DD.md` and `records/data/picks.json` (if its date is today). Do not repeat a buy already made today.
- Make no new buys when the daily or weekly loss limit is hit, or inside the first or last 15 minutes of the session.
- The minimum never overrides the rules. Every call must pass `candidate-evaluation` and stay inside the hard limits in `user-preference` and `goals.json`. Never add a ticker that was dropped, has no live price, or breaks a limit. If fewer calls qualify, or a cap stops more buys, say plainly why (for example "5 positions open, at the cap").
- Do not pad with empty Hold calls. A Change or Hold call counts only for a real open position.

## New buys

- Take candidates in ranked order, best first, until a cap is reached or the candidates run out.
- Confidence: every New stock call must have a confidence of `high`, `medium` or `low` and a one-line reason for that level:
  - high: passes every threshold with room to spare, the trend and news back it up, and the risk/reward to the stop is clear.
  - medium: passes every threshold but one signal is mixed (for example thin margin over a threshold, mixed news, or a weak trend).
  - low: only just passes, or the data is partial or stale. Say what is missing.
  The reason says why this level was chosen, not why to buy. Keep it to one line.
- Size: shares = floor(per-stock cap / entry), or floor(half the cap / entry) once the overall profit goal is reached. Both come from `goals.json` (`maxPerStockUsd`, `overallProfitPct`) as set out in `user-preference`. Keep at least one whole share; if one share costs more than the cap, skip the ticker.
- Stop no more than 2% below the entry. The first target is at least +3%.
- The total of open positions and new buys may not be more than the budget. If the budget can't fit another buy, stop adding buys and say so.

## Output

Three groups, each possibly empty, shown on the Recommendations screen where the user accepts or declines each call:

- New stocks: Buy calls.
- Sell: Sell part and Sell all calls.
- Change: Raise stop, Lower target, Add or Hold calls on positions the user keeps.

One block for each call:

- Action
- Ticker
- Amount: shares and dollars
- Entry, target and stop prices
- Reason: one or two lines
- Confidence (New stocks: required): high, medium or low, with a one-line reason for the level
- Price source and time

End with one line: the cash left after these calls.

## Save

Write the calls to `records/YYYY-MM-DD.md` using today's date. If the file exists, add a new section with the time instead of replacing it.

The app cannot place trades. The user decides and acts.
