---
title: Preferences
description: Summarize how the user invests, from the user-preference skill, the goals and the decisions.
---
Follow the user-preference skill. Read `goals.json`, `records/data/decisions.json` and `records/data/review.json` (if it exists). Do not fetch market data.

Call save_data with the name "preferences" and this shape:

```json
{
  "date": "YYYY-MM-DD",
  "summary": "two or three sentences: how this user invests, in plain English",
  "rules": [{ "group": "Goal | Risk | Profit | Sizing | Timing | Universe", "title": "short name", "value": "the number, e.g. -2% or $1,000", "detail": "the rule as it applies now, one line", "from": "skill | goals | decisions" }],
  "status": [{ "level": "info | warn | bad | good", "text": "a rule that is close to or past its limit right now, from review.json" }],
  "conflicts": ["where goals.json differs from the skill and which value applies (the stricter one)"],
  "learned": [{ "pattern": "what the user tends to accept or decline", "evidence": "the calls behind it" }],
  "questions": ["a preference that is unclear and worth asking the user about"]
}
```

`rules` lists every numbered rule in the user-preference skill. Take `status` from `goal`, `positions` and the summary in review.json (for example: open positions 4 of 5, today's P&L -$150 of the -$200 limit, or the goal reached). If there is no review, add one info item that says to run a review.

Base each learned pattern on at least three decisions; with fewer, leave the list empty and say so. Do not change any file except through save_data. Finish with a short report.
