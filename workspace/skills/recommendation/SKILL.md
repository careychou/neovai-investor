---
description: Turn the ranked candidates and open positions into buy, sell part, sell all or hold calls.
order: 4
---
# Recommendation

Input: the ranked table from `candidate-evaluation` (`records/data/candidates.json` when saved), the open positions, and the limits from `user-preference`.

Open positions are the Buy calls the user accepted in `records/data/decisions.json` and has not closed with an accepted Sell all, plus those in `records/data/review.json`. A call the user did not accept is not a position.

## Open positions first

For each position the user still holds, pick one:

- Sell all: the stop was hit, the reason for buying is no longer true, or the gain reached `earningCapPct`.
- Sell part: the gain is at least half of the target. Sell half and move the stop to the entry price.
- Change: keep the position but adjust it, for example raise the stop after a gain, lower the target when momentum fades, or add to it within the limits. Say what changes and why.
- Hold: none of the above. Give the current gain or loss.

## New buys

- At most three buys a day. Recommending nothing is a valid result, so say so plainly.
- Take candidates from the top of the ranked table only.
- Size: no position above the per-position limit in `user-preference`, and the loss at the stop may not be more than 1 percent of the budget.
- The total of open positions and new buys may not be more than the budget.

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
- Price source and time

End with one line: the cash left after these calls.

## Save

Write the calls to `records/YYYY-MM-DD.md` using today's date. If the file exists, add a new section with the time instead of replacing it.

The app cannot place trades. The user decides and acts.
