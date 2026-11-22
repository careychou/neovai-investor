---
description: Turn the ranked candidates and open positions into buy, sell part, sell all or hold calls.
order: 4
---
# Recommendation

Input: the ranked table from `candidate-evaluation`, the open positions in `records/`, and the limits from `user-preference`.

## Open positions first

For each position the user still holds, pick one:

- Sell all: the stop was hit, the reason for buying is no longer true, or the gain reached `earningCapPct`.
- Sell part: the gain is at least half of the target. Sell half and move the stop to the entry price.
- Hold: none of the above. Give the current gain or loss.

## New buys

- At most three buys a day. Recommending nothing is a valid result, so say so plainly.
- Take candidates from the top of the ranked table only.
- Size: no position above the per-position limit in `user-preference`, and the loss at the stop may not be more than 1 percent of the budget.
- The total of open positions and new buys may not be more than the budget.

## Output

One block for each call:

- Action: Buy, Sell part, Sell all or Hold
- Ticker
- Amount: shares and dollars
- Entry, target and stop prices
- Reason: one or two lines
- Price source and time

End with one line: the cash left after these calls.

## Save

Write the calls to `records/YYYY-MM-DD.md` using today's date. If the file exists, add a new section with the time instead of replacing it.

The app cannot place trades. The user decides and acts.
