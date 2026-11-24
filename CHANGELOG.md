# Changelog

What each version of Neovai Investor added, newest first.

## 0.17.0

Three buckets and risk numbers. The budget now splits 40% long-term holds, 40% trades and 20% T-bill income. The market scan screens for under-followed quality companies (small and mid caps with few analysts, solid returns on capital, cash flow and low debt) for the long bucket, and flags hype names (RSI over 75, heavy short interest, a news spike), which are allowed only as quick trades. Long holds get their own rules (user-preference 26 to 33): an 8–10% stop or a close under the 200-day average, holding through earnings while the thesis holds, a third sold at +30% with the rest trailed, up to 1.5× the per-stock cap. Every call shows its bucket, Candidates filters by bucket, and Recommendations shows each bucket against its cap. Market Scan's chart reaches 2, 5 and 10 years and Max with 50/200-day (or 10/40-week) averages and the yearly growth rate, and a **Details** button and a clickable watch list open any stock's long chart, key stats (valuation, quality, risk, who follows it, growth and income) and hidden-jewel checks. Performance adds **Trend and risk vs the S&P 500**: growth of $100 against SPY, drawdown, and alpha, beta, Sharpe, Sortino, max drawdown, volatility, correlation and up/down capture, for your account since the start or for today's mix over 1, 3 or 5 years. The review job saves the same numbers as `riskMetrics`, and the recommendation job trims trades when beta, drawdown or Sharpe say the account is running hot.

## 0.16.0

Holdings you bought yourself. On the Performance screen, **Add holding** records a stock, ETF or mutual fund you bought outside the app's calls, with shares, average cost, buy date and a note. It joins the Positions table marked "Added by you", priced live, and counts in the account as extra money: it adds to total value, invested and unrealized profit, but never touches the app's cash, goal or win rate. Click any position, yours or the app's, for its dividends (last 12 months, yield, your yearly income, recent payouts), company or fund facts, and for funds the top holdings with their weights. The list lives in `records/data/holdings.json`; only the app writes it, and the agents read it for news, overlap and the account review.

## 0.15.0 (kernel v0.15.0)

Links and a turn rail in chat. Web addresses in your messages, the agents' replies, run activity and screen tables, lists and metrics are clickable and open in your browser, and stock cashtags such as `$AAPL` link to their quote page (the app's only link rule, in `shell/renderer/src/links.ts`, passed to the kernel as `links`). Long table cells show their full text on hover. Codify's chat has a rail on its right edge with a tick per request: hover shows "Turn N · prompt", click jumps to it, and the turn in view is highlighted.

## 0.14.0

A **Skills** page in the left menu lists every skill the app uses, grouped by where it lives: this app's workspace skills (read and edit them here, or have Codify change them) and shared skills from the project's `.github/skills` and your `~/.copilot/skills` (read-only; both agents can load them by name). Codify's second column is now session history only, and each request can be renamed (pencil or double-click). Both come from kernel v0.14.0 (`SessionList`, `SkillList`, `loadSkillSources`).

## 0.13.0

Publish goes straight to the remote repository (Settings › Publish › Repository, e.g. `git@github.com:you/neovai-investor.git`): it downloads the repository into a temporary folder, copies the workspace in, commits, pushes and deletes the folder, so no local working copy is needed (a local folder still works).

## 0.12.0

A publish button next to the paperclip in Codify. One click copies the app's workspace into this repository's `workspace/` folder (leaving out run records and your preferences), commits and pushes, and the chat shows each step as it happens.

## 0.11.0

Codify and the Main App's runtime agent can hand independent parts of a request to helper agents that run at the same time (for example one per stock); each helper shows as a step you can open to see its own work, nested in the chat, and Codify's helpers can run in the background and report back when done.

## 0.10.0

Every chat (Codify and run activity) shows tool steps in three levels, a one-line summary, then the steps in plain words, then each step's input and output, and the attach button is a paperclip.

## 0.9.0

Panels can draw trading-style charts (`chart` block or `<Chart>`: candlesticks, line, area, bars, volume, last-price tag, hover O/H/L/C), fetch live data through the main process (`useFetch`, `fetchJson`), import plain `.css` files and split into many files; Market Scan ships a live symbol chart (`ui/SymbolChart.tsx`) that Codify built.
