# Records

What the app's runs write. The runtime agent may write only inside this folder.

- `YYYY-MM-DD.md`: one file per day. The `recommendation` skill writes the day's calls here, and `performance-review` reads them and adds the outcomes.
- `data/<name>.json`: data the screens show, written with `save_data` (`market`, `candidates`, `picks`, `review`, `preferences`), one per screen.
- `data/decisions.json`: the calls the user accepted or declined on the Recommendations screen. Only the app writes it; the agents read it.
- `data/holdings.json`: stocks and funds the user bought outside the app's calls, added on the Performance screen. Only the app writes it; the agents read it. They count as extra money, outside the app's cash.
- `runs/<job>/<time>.md`: the report of each job run.
- `sources.md`: data sources that worked, kept by `market-scan`.
