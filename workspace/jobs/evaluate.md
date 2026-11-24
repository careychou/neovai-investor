---
title: Candidate evaluation
description: Check the watch list against the goals with the candidate-evaluation skill.
---
Follow the user-preference rules and the candidate-evaluation skill.

The watch list is `watch` in `records/data/market.json`. If that file is missing or its date is not today, run the market-scan skill first and save its result as "market" (the shape in jobs/scan.md).

Before you finish, call save_data with the name "candidates" and this shape:

```json
{
  "date": "YYYY-MM-DD",
  "summary": "one or two sentences in markdown",
  "ranked": [{ "rank": 1, "ticker": "ABC", "name": "ABC Corp.", "bucket": "long | trade", "horizon": "intraday | days | 6-24 months", "price": 0, "target": 0, "stop": 0, "rr": 1.8, "volume": "1.7x avg", "trend": "+3.8% month", "earnings": "YYYY-MM-DD", "quality": "4/5: ROIC 18%, F-score 7 (long only, else omit)", "valuation": "4/5: PEG 0.9, FCF yield 6% (long only, else omit)", "thesis": "long only: why it is missed / what breaks it", "hype": false, "reason": "one line", "source": "site, time" }],
  "dropped": [{ "ticker": "XYZ", "name": "XYZ Inc.", "rule": "the rule that removed it" }]
}
```

"name" is the company or fund name as listed (take it from the market scan watch list or the quote page); use "no data" if you cannot find it, never guess.

An empty ranked list is a valid result. Finish with a short report.
