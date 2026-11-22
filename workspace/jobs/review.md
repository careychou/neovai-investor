---
title: Performance review
description: Score past picks and monitor open positions with the performance-review skill.
---
Follow the performance-review skill.

Before you finish, call save_data with the name "review" and this shape:

```json
{
  "date": "YYYY-MM-DD",
  "summary": "two to four sentences in markdown",
  "metrics": [{ "label": "Hit rate", "value": "4 of 6" }],
  "positions": [{ "ticker": "ABC", "since": "YYYY-MM-DD", "shares": 0, "entry": 0, "now": 0, "result": "+1.2%", "target": 0, "stop": 0, "watch": "what to watch next, one line" }],
  "outcomes": [{ "date": "YYYY-MM-DD", "ticker": "ABC", "action": "Buy", "decision": "accepted | declined | none", "entry": 0, "now": 0, "result": "+3.1%", "status": "open | target hit | stopped out" }],
  "suggestions": [{ "skill": "candidate-evaluation", "change": "the exact rule to change", "why": "evidence from at least three calls" }]
}
```

`positions` are the accepted Buy calls still open. Finish with a short report. Suggest skill changes only as suggestions; the user makes them in Codify.
