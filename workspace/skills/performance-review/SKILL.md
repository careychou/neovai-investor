---
description: Check past recommendations against today's prices and say what to change in the skills.
order: 5
---
# Performance review

Input: every file in `records/` and today's live prices.

## Steps

1. Read `records/data/decisions.json`: score accepted calls as the user's real results, and declined calls separately as what was skipped.
2. Read the record files. List each recommendation with its date, action, ticker, entry, target and stop.
3. Get today's price for each ticker, with source and time.
4. Mark each recommendation:
   - Win: the target was reached before the stop.
   - Loss: the stop was reached first.
   - Open: neither yet. Give the gain or loss so far in percent.
5. Add it up: number of wins, losses and open calls, win rate, average gain, average loss and the total result in dollars against the budget.

## What to learn

- What worked: patterns shared by the wins (sector, setup, time of day, market mood).
- What did not: patterns shared by the losses.
- Your choices: how the accepted calls did against the declined ones, and whether the user's picks beat the full list.
- Suggested changes: name the skill and the exact rule to change, and why. Base each one on at least three recommendations, not on a single result.

Offer the changes to the user. Edit a skill only after the user agrees.

## Save

Add an "Outcome" section to each record file that was reviewed, with the date of the review. Never change the original recommendation text.

If `records/` holds no recommendations yet, say so and stop.
