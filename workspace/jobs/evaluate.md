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
  "ranked": [{ "rank": 1, "ticker": "ABC", "name": "ABC Corp.", "bucket": "long | trade", "horizon": "intraday | days | 6-24 months", "price": 0, "target": 0, "stop": 0, "rr": 1.8, "volume": "1.7x avg", "trend": "+3.8% month", "earnings": "YYYY-MM-DD", "quality": "4/5: ROIC 18%, F-score 7 (long only, else omit)", "valuation": "4/5: PEG 0.9, FCF yield 6% (long only, else omit)", "thesis": "long only: why it is missed / what breaks it", "hype": false, "reason": "one line", "source": "site, time", "business": "what the company does, in one or two plain sentences", "industry": "industry as listed", "competitors": [{ "ticker": "XYZ", "name": "XYZ Inc.", "note": "how it competes, a few words" }] }],
  "dropped": [{ "ticker": "XYZ", "name": "XYZ Inc.", "rule": "the rule that removed it" }]
}
```

"name" is the company or fund name as listed (take it from the market scan watch list or the quote page); use "no data" if you cannot find it, never guess.

For every ranked stock, fill "business", "industry" and "competitors" so a non-expert can tell what the company does:
- "business": one or two short sentences in everyday words: what it sells, to whom, and how it makes most of its money (for example "Sells WAKIX, a pill for daytime sleepiness in people with narcolepsy; almost all sales come from this one drug."). No jargon; spell out terms like "narcolepsy" only if needed.
- "industry": as listed on the stockanalysis.com company profile (`https://stockanalysis.com/stocks/<ticker>/company/`), which also has the full description.
- "competitors": two to four listed companies that sell the same kind of product to the same customers, with a few words on how each competes. Use the company's 10-K "Competition" section, the profile, or news; leave the list empty rather than guess. For funds, list two or three similar funds.
Use "no data" for "business" or "industry" only if you could not read them.

An empty ranked list is a valid result. Finish with a short report.
