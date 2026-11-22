---
title: Preferences
description: Summarize how the user invests, from the user-preference skill, the goals and the decisions.
---
Follow the user-preference skill. Read `goals.json` and `records/data/decisions.json`. Do not fetch market data.

Call save_data with the name "preferences" and this shape:

```json
{
  "date": "YYYY-MM-DD",
  "summary": "two or three sentences: how this user invests, in plain English",
  "considerations": [{ "area": "Holding period | Position size | Risk | Universe | Hedging | ...", "rule": "the rule as it applies now", "from": "skill | goals | decisions" }],
  "learned": [{ "pattern": "what the user tends to accept or decline", "evidence": "the calls behind it" }],
  "questions": ["a preference that is unclear and worth asking the user about"]
}
```

Base each learned pattern on at least three decisions; with fewer, leave the list empty and say so. Do not change any file except through save_data. Finish with a short report.
