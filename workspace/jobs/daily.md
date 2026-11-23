---
title: Full daily run
description: Run the whole loop: market scan, candidate evaluation and recommendations.
---
This job may be started with an input option `mode`. It picks how much of the loop to redo. If there is no input, or `mode` is missing or unknown, use "full".

- `"full"`: full run. Run the skills in order: user-preference, market-scan, candidate-evaluation, recommendation. Save "market" (jobs/scan.md), "candidates" (jobs/evaluate.md) and "picks" (jobs/recommend.md). The "market" data must include "holdingsNote" and "holdingsNews" (News on my holdings in the market-scan skill). Use any bad holdings news when you make the calls on open positions. Set "basedOn" to: "Full run: new market scan and candidates from <today's date>."
- `"reuse-scan"`: reuse today's scan. Do not run a new market scan. Reuse `records/data/market.json` as it is, whatever its date, and use its mood, alerts and holdings news as the market context. Run user-preference, candidate-evaluation and recommendation. Save "candidates" and "picks". Set "basedOn" to: "Reused market scan from <market date>; candidates re-checked today." If `market.json` is missing, save "picks" with empty buys, sells and changes, zero counts, and a summary that says to use the full run, then stop.
- `"reuse-candidates"`: reuse candidates. Do not run a market scan or a candidate evaluation. Reuse `records/data/candidates.json` as it is, whatever its date, and follow jobs/recommend.md exactly (including what to do when the file is missing). Save only "picks". Set "basedOn" to: "Reused candidates from <candidates date> (market scan <market date>)."

In every mode, "picks" uses the shape and rules in jobs/recommend.md, and the open-position calls use today's prices. Save each step's data as you go.

Use "no data" for anything you could not fetch. Finish with a short report: the mode you ran, the dates of any scan or candidates you reused, the mood, the calls and the cash left.
