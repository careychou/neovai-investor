---
title: Performance review
description: Score past recommendations against today's prices.
---
Follow the performance-review skill.

Before you finish, call save_data with the name "review" and this shape:

```json
{
  "date": "YYYY-MM-DD",
  "summary": "two to four sentences in markdown",
  "metrics": [{ "label": "Hit rate", "value": "4 of 6" }],
  "outcomes": [{ "date": "YYYY-MM-DD", "ticker": "ABC", "action": "Buy", "decision": "accepted | declined | none", "entry": 0, "now": 0, "result": "+3.1%", "status": "open | target hit | stopped out" }]
}
```

Finish with a short report. Suggest skill changes only as suggestions; the user makes them in Codify.
