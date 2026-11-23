---
title: Refresh from last market scan
description: Reuse the saved market scan, re-check the candidates with the candidate-evaluation skill, then make new recommendations.
---
This job is the same as the daily job with `mode` "reuse-scan". Ignore any input option.

Do not run a new market scan. Reuse `records/data/market.json` as it is, whatever its date. If it is missing, say so in the report, save "picks" with empty lists and a summary that says to run a full refresh, and stop.

Then run the skills in order: user-preference, candidate-evaluation, recommendation. Use the saved market mood, alerts and holdings news from `market.json` as the market context.

Save "candidates" with the shape in jobs/evaluate.md. Then save "picks" with the shape and rules in jobs/recommend.md, with "basedOn" set to: "Reused market scan from <market date>; candidates re-checked today."

Use "no data" for any price you could not fetch. Finish with a short report: the date of the scan you reused, the calls and the cash left.
