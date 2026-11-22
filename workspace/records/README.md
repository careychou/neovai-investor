# Records

What the app's runs write. The runtime agent may write only inside this folder.

- `YYYY-MM-DD.md`: one file per day. The `recommendation` skill writes the day's calls here, and `performance-review` reads them and adds the outcomes.
- `data/<name>.json`: data the screens show, written with `save_data` (for example `today`, `review`).
- `runs/<job>/<time>.md`: the report of each job run.
- `sources.md`: data sources that worked, kept by `market-scan`.
